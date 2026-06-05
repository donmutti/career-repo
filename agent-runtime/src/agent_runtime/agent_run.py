"""AgentRun — live run handle."""

import asyncio
import json
import time
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Protocol

from pydantic import BaseModel

from .agent_run_store import AgentRunStatus, AgentRunStore
from .agent_sdk import AgentSDK, AgentSDKOptions, AgentSDKPermissionMode, AgentSdkAssistantMessage, AgentSdkResultMessage, AgentSdkTextBlock, AgentSdkToolUseBlock


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

class AgentRunError(Exception):
    """Raised on SDK error, timeout, or unparseable output."""


class AgentRunResult(BaseModel):
    """Return envelope for generate() calls."""
    run_id: str
    model: str
    duration_ms: int
    cost_usd: float
    output: Any


class AgentRunEventType(str, Enum):
    TEXT = "text"
    TOOL_USE = "tool_use"
    DONE = "done"
    CANCELLED = "cancelled"
    ERROR = "error"


@dataclass
class AgentRunToolUseData:
    name: str
    input: Any


@dataclass
class AgentRunDoneData:
    run_id: str
    model: str
    duration_ms: int
    cost_usd: float


class AgentRunEvent(BaseModel):
    """Single event in the underlying stream."""
    type: AgentRunEventType
    data: Any


# ---------------------------------------------------------------------------
# Observer
# ---------------------------------------------------------------------------

class AgentRunObserver(Protocol):
    def on_run_start(self, run: Any) -> None: ...

    def on_run_complete(self, run_id: str) -> None: ...

    def on_run_fail(self, run_id: str) -> None: ...


# ---------------------------------------------------------------------------
# AgentRun — live run
# ---------------------------------------------------------------------------

class AgentRun:
    """Live run — owns its lifecycle and can invoke Claude.

    Constructed by AgentRuntime. Injected into background coroutines, so they
    can call generate() and mark the run terminal.
    """

    def __init__(
            self,
            run_id: str,
            agent_name: str,
            store: AgentRunStore,
            sdk: AgentSDK,
            prompts_dir: Path,
            tool_allowlist: Dict[str, List[str]],
            tasks: Dict[str, asyncio.Task],
    ) -> None:
        self.run_id = run_id
        self.agent_name = agent_name
        self._store = store
        self._sdk = sdk
        self._prompts_dir = prompts_dir
        self._tool_allowlist = tool_allowlist
        self._tasks = tasks
        self._status: Optional[AgentRunStatus] = None

    # ------------------------------------------------------------------
    # Invocation
    # ------------------------------------------------------------------

    async def generate(
            self,
            payload: Any,
            expects_json: bool = True,
            timeout: float = 300.0,
            permission_mode: AgentSDKPermissionMode = AgentSDKPermissionMode.BYPASS_PERMISSIONS,
            max_turns: int = 30,
    ) -> AgentRunResult:
        """Run this agent to completion and return an AgentRunResult."""
        prompt_path = self._prompt_path()
        text_chunks: List[str] = []
        done_data: Optional[AgentRunDoneData] = None

        # Open the underlying event stream
        stream = self._stream(
            prompt_path,
            payload,
            timeout=timeout,
            permission_mode=permission_mode,
            max_turns=max_turns
        )

        # Consume the stream, collecting text and done metadata; raise on error or cancellation
        async for event in stream:
            if event.type == AgentRunEventType.TEXT:
                text_chunks.append(str(event.data))
            elif event.type == AgentRunEventType.DONE:
                done_data = event.data if isinstance(event.data, AgentRunDoneData) else None
            elif event.type in (AgentRunEventType.ERROR, AgentRunEventType.CANCELLED):
                raise AgentRunError(str(event.data))

        raw_text = "".join(text_chunks).strip()

        # Parse output — either raw text or the first JSON value in the response
        if not expects_json:
            output = raw_text
        else:
            json_start = raw_text.find("[")
            obj_start = raw_text.find("{")
            if json_start == -1 or (obj_start != -1 and obj_start < json_start):
                json_start = obj_start
            json_text = raw_text[json_start:] if json_start != -1 else raw_text
            try:
                output, _ = json.JSONDecoder().raw_decode(json_text)
            except json.JSONDecodeError as e:
                raise AgentRunError(f"Agent returned invalid JSON: {e}\nOutput: {raw_text[:300]}")

        return AgentRunResult(
            output=output,
            cost_usd=done_data.cost_usd if done_data else 0.0,
            duration_ms=done_data.duration_ms if done_data else 0,
            model=done_data.model if done_data else "",
            run_id=done_data.run_id if done_data else "",
        )

    async def generate_stream(
            self,
            payload: Any,
            timeout: float = 600.0,
            permission_mode: AgentSDKPermissionMode = AgentSDKPermissionMode.BYPASS_PERMISSIONS,
            max_turns: int = 30,
    ) -> AsyncGenerator[AgentRunEvent, None]:
        """Run this agent and yield AgentRunEvents."""
        prompt_path = self._prompt_path()

        # Open the underlying event stream
        stream = self._stream(
            prompt_path,
            payload,
            timeout=timeout,
            permission_mode=permission_mode,
            max_turns=max_turns,
        )

        # Yield each event to the caller
        async for event in stream:
            yield event

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def set_meta(self, meta: dict) -> None:
        self._store.set_meta(self.run_id, meta)

    def is_running(self) -> bool:
        record = self._store.get(self.run_id)
        return record is not None and record.status == AgentRunStatus.RUNNING

    def complete(self, output: str = "") -> None:
        self._status = AgentRunStatus.COMPLETED
        self._store.complete(self.run_id, output)

    def fail(self, output: str = "") -> None:
        self._status = AgentRunStatus.FAILED
        self._store.fail(self.run_id, output)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _prompt_path(self) -> Path:
        name = self.agent_name if self.agent_name.endswith(".md") else f"{self.agent_name}.md"
        path = self._prompts_dir / name
        if not path.exists():
            raise AgentRunError(f"Unknown agent: {self.agent_name}")
        return path

    async def _stream(
            self,
            prompt_path: Path,
            payload: Any,
            timeout: float = 300.0,
            permission_mode: AgentSDKPermissionMode = AgentSDKPermissionMode.BYPASS_PERMISSIONS,
            max_turns: int = 30,
    ) -> AsyncGenerator[AgentRunEvent, None]:

        # Prepare local variables captured by _drive closure to avoid self-references across await boundaries
        sdk = self._sdk
        store = self._store
        run_id = self.run_id
        tasks = self._tasks
        allowed_tools = self._tool_allowlist.get(prompt_path.name, [])
        start_ms = int(time.time() * 1000)
        system_prompt = prompt_path.read_text()
        user_message = f"<input>{payload if isinstance(payload, str) else json.dumps(payload)}</input>"

        # Queue connects the _drive coroutine (producer) and the while loop below (consumer)
        queue: asyncio.Queue[Optional[AgentRunEvent]] = asyncio.Queue()

        # Queue producer: runs the SDK call and pushes events into the queue
        async def _drive():
            text_chunks: List[str] = []
            cost_usd = 0.0
            model_name = ""
            try:
                # Configure SDK invocation
                options = AgentSDKOptions(
                    permission_mode=permission_mode,
                    max_turns=max_turns,
                )

                # Start the SDK stream
                messages = sdk.query(
                    prompt=user_message,
                    system=system_prompt,
                    tools=allowed_tools,
                    options=options,
                )

                # Dispatch each SDK message into stream events
                async for message in messages:
                    if isinstance(message, AgentSdkAssistantMessage):
                        model_name = message.model or model_name
                        for block in message.content:
                            if isinstance(block, AgentSdkTextBlock):
                                text_chunks.append(block.text)
                                await queue.put(AgentRunEvent(type=AgentRunEventType.TEXT, data=block.text))
                            elif isinstance(block, AgentSdkToolUseBlock):
                                await queue.put(AgentRunEvent(
                                    type=AgentRunEventType.TOOL_USE,
                                    data=AgentRunToolUseData(name=block.name, input=block.input),
                                ))
                    elif isinstance(message, AgentSdkResultMessage):
                        cost_usd = message.total_cost_usd

                # On SDK stream exhaustion, mark AgentRun complete and emit DONE event
                output_text = "".join(text_chunks)
                duration_ms = int(time.time() * 1000) - start_ms
                store.complete(run_id, output_text)
                await queue.put(AgentRunEvent(type=AgentRunEventType.DONE, data=AgentRunDoneData(
                    run_id=run_id,
                    model=model_name,
                    duration_ms=duration_ms,
                    cost_usd=cost_usd,
                )))

            except asyncio.CancelledError:
                store.cancel(run_id)
                await queue.put(AgentRunEvent(type=AgentRunEventType.CANCELLED, data={"run_id": run_id}))
            except Exception as e:
                store.fail(run_id, "")
                await queue.put(AgentRunEvent(type=AgentRunEventType.ERROR, data={"run_id": run_id, "message": str(e)}))
            finally:
                await queue.put(None)  # sentinel — signals consumer to stop
                tasks.pop(run_id, None)

        # Start queue producer and register the task so it can be cancelled
        task = asyncio.create_task(_drive())
        tasks[run_id] = task

        # Queue consumer: pulls events and yields each to the caller
        try:
            while True:
                event = await asyncio.wait_for(queue.get(), timeout=timeout)
                if event is None:
                    break
                yield event
                if event.type in (AgentRunEventType.DONE, AgentRunEventType.CANCELLED, AgentRunEventType.ERROR):
                    break
        except asyncio.TimeoutError:
            task.cancel()
            store.fail(run_id, "")
            tasks.pop(run_id, None)
            yield AgentRunEvent(type=AgentRunEventType.ERROR, data={"run_id": run_id, "message": "Timeout"})
            raise AgentRunError("Agent invocation timed out")
