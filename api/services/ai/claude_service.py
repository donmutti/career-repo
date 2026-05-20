"""Claude agent SDK runner for AI operations."""

import asyncio
import json
import time
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, TypeVar

from pydantic import BaseModel

from api.db.daos.agent.agent_run_dao import AgentRunDAO
from api.models.entities import Opportunity, Profile

_COMMANDS_DIR = Path(__file__).parent / "commands"

_TOOL_ALLOWLIST: Dict[str, List[str]] = {
    "scan-inbox.md": ["mcp__gmail__*"],
    "extract-opportunity-from-email.md": [],
    "source-opportunity.md": ["WebFetch"],
    "generate-attachment.md": [],
    "parse-work-experience-from-resume.md": [],
}

T = TypeVar("T")


class ClaudeError(Exception):
    """Raised on SDK error, timeout, or unparseable output."""


class ClaudeResult(BaseModel):
    """Return envelope for collected (non-streaming) calls."""

    output: Any
    cost_usd: float
    duration_ms: int
    model: str
    run_id: str


class StreamEvent(BaseModel):
    """Single event in the underlying stream."""

    type: str  # text | tool_use | tool_result | done | cancelled | error
    data: Any


class ClaudeService:
    """Invokes Claude via the claude-agent-sdk for AI operations."""

    def __init__(self, agent_run_dao: AgentRunDAO):
        self._dao = agent_run_dao
        self._tasks: Dict[str, asyncio.Task] = {}

    # ------------------------------------------------------------------
    # Public named methods
    # ------------------------------------------------------------------

    async def scan_inbox(self, max_results: int = 50, existing_run_id: Optional[str] = None) -> ClaudeResult:
        command_path = _COMMANDS_DIR / "scan-inbox.md"
        payload: Dict[str, Any] = {"max_results": max_results}
        return await self._collect(command_path, payload, existing_run_id=existing_run_id)

    async def extract_opportunities(self, email_content: str) -> ClaudeResult:
        command_path = _COMMANDS_DIR / "extract-opportunity-from-email.md"
        return await self._collect(command_path, email_content)

    async def source_opportunity(self, opportunity: Opportunity, profile: Optional[Profile] = None, work_experiences: Optional[List] = None, run_id: Optional[str] = None) -> ClaudeResult:
        command_path = _COMMANDS_DIR / "source-opportunity.md"
        payload = {
            "opportunity": opportunity.model_dump(mode="json"),
            "profile": profile.model_dump(mode="json") if profile else None,
            "work_experiences": [we.model_dump(mode="json") for we in work_experiences] if work_experiences else [],
        }
        return await self._collect(command_path, payload, existing_run_id=run_id)

    async def parse_work_experience_from_resume(self, resume_text: str, run_id: Optional[str] = None) -> ClaudeResult:
        command_path = _COMMANDS_DIR / "parse-work-experience-from-resume.md"
        return await self._collect(command_path, resume_text, existing_run_id=run_id)

    async def generate_markdown_attachment(
        self,
        attachment_type: str,
        opportunity: Opportunity,
        profile: Optional[Profile] = None,
        work_experiences: Optional[List] = None,
        run_id: Optional[str] = None,
    ) -> ClaudeResult:
        command_path = _COMMANDS_DIR / "generate-attachment.md"
        payload = {
            "attachment_type": attachment_type,
            "opportunity": opportunity.model_dump(mode="json"),
            "profile": profile.model_dump(mode="json") if profile else None,
            "work_experiences": [we.model_dump(mode="json") for we in work_experiences] if work_experiences else [],
        }
        return await self._collect(command_path, payload, raw_text=True, existing_run_id=run_id)

    async def stream_to_client(
        self,
        command_path: Path,
        payload: Any,
        opportunity_id: Optional[str] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        async for event in self._run_stream(command_path, payload, opportunity_id):
            yield event

    async def cancel(self, run_id: str) -> None:
        """Cancel an active run by cancelling its asyncio task."""
        task = self._tasks.get(run_id)
        if task and not task.done():
            task.cancel()

    # ------------------------------------------------------------------
    # Private primitives
    # ------------------------------------------------------------------

    async def _collect(
        self,
        command_path: Path,
        payload: Any,
        opportunity_id: Optional[str] = None,
        raw_text: bool = False,
        existing_run_id: Optional[str] = None,
    ) -> ClaudeResult:
        """Consume the full event stream and return a ClaudeResult."""
        text_chunks: List[str] = []
        done_data: Dict[str, Any] = {}

        async for event in self._run_stream(command_path, payload, opportunity_id, existing_run_id=existing_run_id):
            if event.type == "text":
                text_chunks.append(str(event.data))
            elif event.type == "done":
                done_data = event.data if isinstance(event.data, dict) else {}
            elif event.type in ("error", "cancelled"):
                raise ClaudeError(str(event.data))

        assistant_text = "".join(text_chunks).strip()

        if raw_text:
            output = assistant_text
        else:
            # Extract the first complete JSON object or array from the output
            json_start = assistant_text.find("[")
            obj_start = assistant_text.find("{")
            if json_start == -1 or (obj_start != -1 and obj_start < json_start):
                json_start = obj_start
            trimmed = assistant_text[json_start:] if json_start != -1 else assistant_text
            # Use a decoder to extract just the first valid JSON value
            try:
                output, _ = json.JSONDecoder().raw_decode(trimmed)
            except json.JSONDecodeError as e:
                raise ClaudeError(f"Claude returned invalid JSON: {e}\nOutput: {assistant_text[:300]}")

        return ClaudeResult(
            output=output,
            cost_usd=done_data.get("cost_usd", 0.0),
            duration_ms=done_data.get("duration_ms", 0),
            model=done_data.get("model", ""),
            run_id=done_data.get("run_id", ""),
        )

    async def _run_stream(
        self,
        command_path: Path,
        payload: Any,
        opportunity_id: Optional[str] = None,
        existing_run_id: Optional[str] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        import claude_agent_sdk

        system_prompt = command_path.read_text()
        if isinstance(payload, str):
            user_message = f"<input>{payload}</input>"
        else:
            user_message = f"<input>{json.dumps(payload)}</input>"

        command_file_name = command_path.name
        allowed_tools = _TOOL_ALLOWLIST.get(command_file_name, [])

        run = self._dao.get(existing_run_id) if existing_run_id else self._dao.create(command_file_name, opportunity_id)
        start_ms = int(time.time() * 1000)

        queue: asyncio.Queue[Optional[StreamEvent]] = asyncio.Queue()

        async def _drive():
            text_chunks: List[str] = []
            cost_usd = 0.0
            model_name = ""
            try:
                options = claude_agent_sdk.ClaudeAgentOptions(
                    system_prompt=system_prompt,
                    allowed_tools=allowed_tools,
                    permission_mode="bypassPermissions",
                    max_turns=30,
                )
                async for message in claude_agent_sdk.query(prompt=user_message, options=options):
                    if isinstance(message, claude_agent_sdk.AssistantMessage):
                        model_name = message.model or model_name
                        for block in (message.content or []):
                            if isinstance(block, claude_agent_sdk.TextBlock):
                                text_chunks.append(block.text)
                                await queue.put(StreamEvent(type="text", data=block.text))
                            elif isinstance(block, claude_agent_sdk.ToolUseBlock):
                                await queue.put(StreamEvent(
                                    type="tool_use",
                                    data={"name": block.name, "input": block.input},
                                ))
                    elif isinstance(message, claude_agent_sdk.ResultMessage):
                        cost_usd = message.total_cost_usd or 0.0

                output_text = "".join(text_chunks)
                duration_ms = int(time.time() * 1000) - start_ms
                self._dao.complete(run.id, output_text)
                await queue.put(StreamEvent(type="done", data={
                    "cost_usd": cost_usd,
                    "duration_ms": duration_ms,
                    "model": model_name,
                    "run_id": run.id,
                }))

            except asyncio.CancelledError:
                self._dao.cancel(run.id)
                await queue.put(StreamEvent(type="cancelled", data={"run_id": run.id}))
            except Exception as e:
                self._dao.fail(run.id, "")
                await queue.put(StreamEvent(type="error", data={"run_id": run.id, "message": str(e)}))
            finally:
                await queue.put(None)  # sentinel
                self._tasks.pop(run.id, None)

        task = asyncio.create_task(_drive())
        self._tasks[run.id] = task

        try:
            while True:
                event = await asyncio.wait_for(queue.get(), timeout=180.0)
                if event is None:
                    break
                yield event
                if event.type in ("done", "cancelled", "error"):
                    break
        except asyncio.TimeoutError:
            task.cancel()
            self._dao.fail(run.id, "")
            self._tasks.pop(run.id, None)
            yield StreamEvent(type="error", data={"run_id": run.id, "message": "Timeout"})
            raise ClaudeError("Claude invocation timed out")
