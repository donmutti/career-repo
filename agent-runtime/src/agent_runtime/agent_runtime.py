"""AgentRuntime — creates and manages AgentRuns."""

import asyncio
from pathlib import Path
from typing import Any, AsyncGenerator, Coroutine, Dict, List, Optional

from .agent_run import AgentRun, AgentRunEvent, AgentRunObserver, AgentRunResult
from .agent_run_store import AgentRunRecord, AgentRunStatus, InMemoryAgentRunStore
from .agent_sdk import AgentSDK, AgentSDKPermissionMode


class AgentRuntime:
    """Container for agent runs. Owns SDK config, in-memory run store, and task registry.

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
            prompts_dir: Path,
            tool_allowlist: Dict[str, List[str]],
            observer: Optional[AgentRunObserver] = None
    ) -> None:
        self._sdk = sdk
        self._store = InMemoryAgentRunStore()
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
            retries: int = 0,
    ) -> AgentRunResult:
        # Create an AgentRun
        run = self.create(agent_name, external_id)

        # Run it to completion, returns AgentRunResult
        return await run.generate(
            payload,
            expects_json=expects_json,
            timeout=timeout,
            permission_mode=permission_mode,
            max_turns=max_turns,
            retries=retries,
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

    def get(self, run_id: str) -> Optional[AgentRunRecord]:
        """Return the run record for a given run ID, or None if not found."""
        return self._store.get(run_id)

    def list(self) -> List[AgentRunRecord]:
        """Return all run records, newest first."""
        return self._store.list()

    def list_active(self) -> List[AgentRunRecord]:
        """Return all currently running run records."""
        return self._store.list_active()

    def list_active_by_agent_name(self, agent: str) -> List[AgentRunRecord]:
        """Return active runs for a specific agent name."""
        return self._store.list_active_by_agent_name(agent)

    def list_active_by_external_id(self, external_id: str) -> List[AgentRunRecord]:
        """Return active runs for a specific external ID."""
        return self._store.list_active_by_external_id(external_id)

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
        """Cancels an active run by cancelling its asyncio task and marking it cancelled in the store."""
        task = self._tasks.get(run_id)

        # Cancel the task if still running
        if task and not task.done():
            task.cancel()

        # Mark the run cancelled in the store regardless of task state
        self._store.cancel(run_id)
