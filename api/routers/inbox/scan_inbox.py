"""POST /inbox/scan"""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...services.ai import ClaudeService, ClaudeError
from ...db import InboxEmailDAO, EmailOpportunityDAO, AgentRunDAO

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_dao = InboxEmailDAO()
email_opp_dao = EmailOpportunityDAO()
agent_run_dao = AgentRunDAO()
claude = ClaudeService(agent_run_dao)


class ScanInboxStartResponseDto(BaseModel):
    run_id: str


@router.get("/scan/active")
def get_active_scan():
    """Return the active scan run ID if a scan is in progress, else null."""
    active_runs = agent_run_dao.list_active()
    for run in active_runs:
        if run.agent == "scan-inbox.md":
            return {"run_id": run.id}
    return {"run_id": None}


@router.post("/scan", response_model=ScanInboxStartResponseDto)
async def scan_inbox():
    """Start an async inbox scan. Returns run_id immediately; poll GET /agent-runs/{run_id} for status."""
    # Check if a scan is already running
    active_runs = agent_run_dao.list_active()
    for run in active_runs:
        if run.agent == "scan-inbox.md":
            raise HTTPException(status_code=409, detail="A scan is already in progress")

    # Create the agent run record upfront so we can return its ID
    run = agent_run_dao.create("scan-inbox.md", None)

    async def _run_scan():
        try:
            result = await claude.scan_inbox(existing_run_id=run.id)
            scanned_emails = result.output
            for email_data in scanned_emails:
                external_id = email_data.get("id")
                if email_dao.get_by_external_id(external_id):
                    continue
                received_raw = email_data.get("date")
                try:
                    received_at = datetime.fromisoformat(received_raw.replace("Z", "+00:00")) if isinstance(received_raw, str) else (received_raw or datetime.now(timezone.utc))
                except (ValueError, AttributeError):
                    received_at = datetime.now(timezone.utc)
                opportunities = email_data.get("opportunities") or []
                if not opportunities:
                    continue
                created_email = email_dao.create(
                    external_id=external_id,
                    received_at=received_at,
                    from_address=email_data.get("from", ""),
                    to_address=email_data.get("to", ""),
                    subject=email_data.get("subject", ""),
                    body=email_data.get("body", ""),
                )
                for opp in opportunities:
                    title = opp.get("title", "").strip()
                    opp_type = opp.get("type", "job")
                    url = opp.get("url") or None
                    if title:
                        email_opp_dao.create(created_email.id, title, opp_type, url)
        except ClaudeError:
            pass  # already marked failed by ClaudeService

    asyncio.create_task(_run_scan())
    return {"run_id": run.id}
