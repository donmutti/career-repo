"""Inbox scan service."""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from api.config import get_inbox_scan_days, get_inbox_scan_batch_size, get_inbox_scan_keywords
from api.db import InboxEmailDAO, EmailOpportunityDAO, AgentRunDAO
from api.services.ai import Agent, AgentRunError, AgentRun, runtime

logger = logging.getLogger("uvicorn.error")


class InboxService:

    def __init__(self) -> None:
        self._email_dao = InboxEmailDAO()
        self._email_opp_dao = EmailOpportunityDAO()
        self._agent_run_dao = AgentRunDAO()

    def build_scan_query(self) -> str:
        keywords = get_inbox_scan_keywords()
        keyword_str = " OR ".join(f'"{k}"' for k in keywords)
        last_scanned = self._email_dao.last_scanned_at()
        if last_scanned:
            after_dt = datetime.fromisoformat(last_scanned.replace("Z", "+00:00"))
        else:
            after_dt = datetime.now(timezone.utc) - timedelta(days=get_inbox_scan_days())
        after = after_dt.strftime("%Y/%m/%d")
        return f'({keyword_str}) after:{after}'

    def list_active_scans(self):
        return [
            run for run in self._agent_run_dao.list_active()
            if run.agent == Agent.INBOX_SCAN and run.meta is not None
        ]

    def start_scan(self) -> AgentRun:
        run = runtime.create(Agent.INBOX_SCAN)
        run.set_meta({"current": 0, "total": 0, "preparing": True})
        runtime.run(run, self._run_scan(run))
        return run

    async def _run_scan(self, run: AgentRun) -> None:
        # Probe: get total count
        try:
            scan_query = self.build_scan_query()
            logger.info("Starting probe: scan_days=%d query=%r", get_inbox_scan_days(), scan_query)
            probe_result = await runtime.generate(Agent.INBOX_PREFLIGHT, {"query": scan_query}, timeout=300.0)
            probe = probe_result.output
            total = int(probe.get("total", 0))
        except Exception as e:
            run.fail(f"Probe failed: {e}")
            return

        batch_size = get_inbox_scan_batch_size()
        run.set_meta({"current": min(batch_size, total), "total": total, "preparing": False})
        logger.info("Probe complete: total=%d query=%r", total, scan_query)

        # Batch scan loop
        page_token = None
        current = 0

        while True:
            if not run.is_running():
                return

            batch = None
            for attempt in range(3):
                try:
                    result = await runtime.generate(
                        Agent.INBOX_SCAN,
                        {"query": scan_query, "page_token": page_token, "max_results": get_inbox_scan_batch_size()},
                        timeout=300.0,
                    )
                    if isinstance(result.output, dict):
                        batch = result.output
                        break
                    logger.warning("Batch attempt %d returned unexpected type %s, retrying", attempt + 1, type(result.output).__name__)
                except asyncio.CancelledError:
                    return
                except AgentRunError as e:
                    logger.warning("Batch attempt %d failed: %s, retrying", attempt + 1, e)

            if batch is None:
                logger.error("Batch failed after 3 attempts, aborting scan")
                run.fail("Batch failed after 3 attempts")
                return

            scanned_emails = batch.get("emails", [])
            next_page_token = batch.get("next_page_token")

            current += len(scanned_emails)
            run.set_meta({"current": current, "total": total, "preparing": False})
            logger.info("Batch complete: emails=%d current=%d/%d next_page_token=%s", len(scanned_emails), current, total, next_page_token)

            for email_data in scanned_emails:
                external_id = email_data.get("id")
                if self._email_dao.get_by_external_id(external_id):
                    continue
                received_raw = email_data.get("date")
                try:
                    received_at = datetime.fromisoformat(received_raw.replace("Z", "+00:00")) if isinstance(received_raw, str) else (received_raw or datetime.now(timezone.utc))
                except (ValueError, AttributeError):
                    received_at = datetime.now(timezone.utc)
                opportunities = email_data.get("opportunities") or []
                if not opportunities:
                    continue
                created_email = self._email_dao.create(
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
                        self._email_opp_dao.create(created_email.id, title, opp_type, url, organization_name)

            if not next_page_token:
                break

            page_token = next_page_token

        run.complete()
