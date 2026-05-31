"""POST /inbox/scan"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("uvicorn.error")

from ...services.ai import ClaudeError, claude
from ...db import InboxEmailDAO, EmailOpportunityDAO, AgentRunDAO
from ...config import get_inbox_scan_days, get_inbox_scan_batch_size, get_inbox_scan_keywords

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_dao = InboxEmailDAO()
email_opp_dao = EmailOpportunityDAO()
agent_run_dao = AgentRunDAO()

def _build_scan_query() -> str:
    keywords = get_inbox_scan_keywords()
    keyword_str = " OR ".join(f'"{k}"' for k in keywords)
    last_scanned = email_dao.last_scanned_at()
    if last_scanned:
        after_dt = datetime.fromisoformat(last_scanned.replace("Z", "+00:00"))
    else:
        after_dt = datetime.now(timezone.utc) - timedelta(days=get_inbox_scan_days())
    after = after_dt.strftime("%Y/%m/%d")
    return f'({keyword_str}) after:{after}'


class ScanInboxStartResponseDto(BaseModel):
    run_id: str


@router.get("/scan/active")
def get_active_scan():
    """Return the active scan run ID if a scan is in progress, else null."""
    active_runs = agent_run_dao.list_active()
    for run in active_runs:
        if run.agent == "scan-inbox.md" and run.meta is not None:
            return {"run_id": run.id}
    return {"run_id": None}


@router.post("/scan", response_model=ScanInboxStartResponseDto)
async def scan_inbox():
    """Start an async inbox scan. Returns run_id immediately; poll GET /agent-runs/{run_id} for status."""
    active_runs = agent_run_dao.list_active()
    for run in active_runs:
        if run.agent == "scan-inbox.md" and run.meta is not None:
            raise HTTPException(status_code=409, detail="A scan is already in progress")

    run = agent_run_dao.create("scan-inbox.md", None)
    agent_run_dao.set_meta(run.id, {"current": 0, "total": 0, "preparing": True})

    async def _run_scan():
        try:
            # Preflight: get total count
            try:
                scan_query = _build_scan_query()
                logger.info("Starting preflight: scan_days=%d query=%r", get_inbox_scan_days(), scan_query)
                preflight_result = await claude.inbox_preflight(scan_query)
                preflight = preflight_result.output
                total = int(preflight.get("total", 0))
            except (ClaudeError, Exception) as e:
                agent_run_dao.fail(run.id, f"Preflight failed: {e}")
                return

            agent_run_dao.set_meta(run.id, {"current": 0, "total": total, "preparing": False})
            logger.info("Preflight complete: total=%d query=%r", total, scan_query)

            # Batch scan loop
            page_token = None
            current = 0

            while True:
                if agent_run_dao.get(run.id).status != "running":
                    return

                batch = None
                for attempt in range(3):
                    try:
                        result = await claude.scan_inbox(
                            query=scan_query,
                            page_token=page_token,
                            max_results=get_inbox_scan_batch_size(),
                        )
                        if isinstance(result.output, dict):
                            batch = result.output
                            break
                        logger.warning("Batch attempt %d returned unexpected type %s, retrying", attempt + 1, type(result.output).__name__)
                    except asyncio.CancelledError:
                        return
                    except ClaudeError as e:
                        logger.warning("Batch attempt %d failed: %s, retrying", attempt + 1, e)

                if batch is None:
                    logger.error("Batch failed after 3 attempts, aborting scan")
                    agent_run_dao.fail(run.id, "Batch failed after 3 attempts")
                    return

                scanned_emails = batch.get("emails", [])
                next_page_token = batch.get("next_page_token")

                current += len(scanned_emails)
                agent_run_dao.set_meta(run.id, {"current": current, "total": total, "preparing": False})
                logger.info("Batch complete: emails=%d current=%d/%d next_page_token=%s", len(scanned_emails), current, total, next_page_token)

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
                        organization_name = opp.get("organization_name") or None
                        if title:
                            email_opp_dao.create(created_email.id, title, opp_type, url, organization_name)

                if not next_page_token:
                    break

                page_token = next_page_token

            agent_run_dao.complete(run.id, "")

        except Exception as e:
            agent_run_dao.fail(run.id, str(e))

    asyncio.create_task(_run_scan())
    return {"run_id": run.id}
