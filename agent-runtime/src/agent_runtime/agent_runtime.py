"""AgentRuntime — creates and manages AgentRuns."""

import asyncio
from pathlib import Path
from typing import Any, AsyncGenerator, Coroutine, Dict, List, Optional

from .agent_run import AgentRun, AgentRunEvent, AgentRunObserver, AgentRunResult
from .agent_run_store import AgentRunStatus, AgentRunStore
from .agent_sdk import AgentSDK, AgentSDKPermissionMode


class AgentRuntime:
    """Container for agent runs. Owns SDK config, agent run store, and task registry.

    One-shot APIs:
        generate()          — creates AgentRun, runs it to completion, returns AgentRunResult
        generate_stream()   — creates AgentRun, yields AgentRunEvents
    Multi-step APIs:
        create()            — creates and returns a pending AgentRun
        run()               — takes pending AgentRun and starts background coroutine in it
        cancel()            — takes running AgentRun and cancels it
    """

    def __init__(
            self,
            sdk: AgentSDK,
            store: AgentRunStore,
            prompts_dir: Path,
            tool_allowlist: Dict[str, List[str]],
            observer: Optional[AgentRunObserver] = None
    ) -> None:
        self._sdk = sdk
        self._store = store
        self._prompts_dir = prompts_dir
        self._tool_allowlist = tool_allowlist
        self._observer = observer
        self._tasks: Dict[str, asyncio.Task] = {}

    # ------------------------------------------------------------------
    # One-shot APIs
    # ------------------------------------------------------------------

    async def generate(
            self,
            agent_name: str,
            payload: Any,
            external_id: Optional[str] = None,
            expects_json: bool = True,
            timeout: float = 300.0,
            permission_mode: AgentSDKPermissionMode = AgentSDKPermissionMode.BYPASS_PERMISSIONS,
            max_turns: int = 30,
    ) -> AgentRunResult:
        # Create an AgentRun
        run = self.create(agent_name, external_id)

        # Run it to completion, returns AgentRunResult
        return await run.generate(
            payload,
            expects_json=expects_json,
            timeout=timeout,
            permission_mode=permission_mode,
            max_turns=max_turns
        )

    async def generate_stream(
            self,
            agent_name: str,
            payload: Any,
            external_id: Optional[str] = None,
            timeout: float = 600.0,
            permission_mode: AgentSDKPermissionMode = AgentSDKPermissionMode.BYPASS_PERMISSIONS,
            max_turns: int = 30,
    ) -> AsyncGenerator[AgentRunEvent, None]:
        # Create an AgentRun
        run = self.create(agent_name, external_id)

        # Open the event stream
        stream = run.generate_stream(payload, timeout=timeout, permission_mode=permission_mode, max_turns=max_turns)

        # Yield each event to the caller
        async for event in stream:
            yield event

    # ------------------------------------------------------------------
    # Multi-step APIs
    # ------------------------------------------------------------------

    def create(self, agent_name: str, external_id: Optional[str] = None) -> AgentRun:
        # Create an AgentRun record
        record = self._store.create(agent_name, external_id)

        # Create an AgentRun
        run = AgentRun(
            run_id=record.id,
            agent_name=agent_name,
            store=self._store,
            sdk=self._sdk,
            prompts_dir=self._prompts_dir,
            tool_allowlist=self._tool_allowlist,
            tasks=self._tasks,
        )

        # Notify observer that the run has started
        if self._observer is not None:
            self._observer.on_run_start(run)

        return run

    def run(self, run: AgentRun, coro: Coroutine) -> None:
        """Start a background coroutine for an existing AgentRun.

        Wraps the coroutine so that cancellation and unhandled exceptions mark
        the run failed. Fires observer hooks on terminal transitions.
        """

        # Capture locals to avoid self-references across await boundaries
        run_id = run.run_id
        observer = self._observer
        tasks = self._tasks

        # Wrap the coroutine with cancellation and exception handling
        async def _guarded():
            try:
                await coro
            except asyncio.CancelledError:
                if not run._status:
                    run.fail("Cancelled")
                raise
            except Exception:
                if not run._status:
                    run.fail("")
                raise
            finally:
                if run._status and observer:
                    if run._status == AgentRunStatus.COMPLETED:
                        observer.on_run_complete(run_id)
                    else:
                        observer.on_run_fail(run_id)
                tasks.pop(run_id, None)

        # Start the guarded coroutine as a background task
        task = asyncio.create_task(_guarded())

        # Register the task so it can be cancelled
        self._tasks[run_id] = task

    async def cancel(self, run_id: str) -> None:
        """Cancels an active run by cancelling its asyncio task."""
        task = self._tasks.get(run_id)

        # Cancel only if the task is still running
        if task and not task.done():
            task.cancel()
