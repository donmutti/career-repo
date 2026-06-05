"""Inbox scan service."""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List

from api.config import get_inbox_scan_days, get_inbox_scan_batch_size, get_inbox_scan_keywords
from api.db import InboxEmailDAO, EmailOpportunityDAO
from api.services.ai import AgentName, AgentRunError, AgentRun, runtime

logger = logging.getLogger("uvicorn.error")


class InboxService:

    def __init__(self) -> None:
        self._email_dao = InboxEmailDAO()
        self._email_opp_dao = EmailOpportunityDAO()

    def build_scan_query(self) -> str:
        keywords = get_inbox_scan_keywords()
        keyword_str = " OR ".join(f'"{k}"' for k in keywords)
        last_scanned = self._email_dao.last_scanned_at()
        if last_scanned:
            # Rescan from midnight of the last scan day, including the full day of the last scan,
            # so emails that arrived during or just after the previous run are not missed
            after_dt = datetime.fromisoformat(last_scanned.replace("Z", "+00:00")).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            after_dt = datetime.now(timezone.utc) - timedelta(days=get_inbox_scan_days())
        after_epoch = int(after_dt.timestamp())
        return f'({keyword_str}) after:{after_epoch}'

    def list_active_scans(self):
        return [
            run for run in runtime.list_active_by_agent_name(AgentName.INBOX_SCAN)
            if run.meta is not None
        ]

    def start_scan(self) -> AgentRun:
        run = runtime.create(AgentName.INBOX_SCAN)
        run.set_meta({"current": 0, "total": 0, "preparing": True})
        runtime.run(run, self._run_scan(run))
        return run

    async def _run_scan(self, run: AgentRun) -> None:
        # Probe: fetch all matching IDs
        try:
            scan_query = self.build_scan_query()
            logger.info("Starting probe: scan_days=%d query=%r", get_inbox_scan_days(), scan_query)
            probe_result = await runtime.generate(AgentName.INBOX_PREFLIGHT, {"query": scan_query}, timeout=300.0)
            probe = probe_result.output
            all_ids: List[str] = probe.get("ids") or []
        except Exception as e:
            run.fail(f"Probe failed: {e}")
            return

        # Filter out already-known emails
        known_ids = self._email_dao.get_known_external_ids(all_ids)
        new_ids = [eid for eid in all_ids if eid not in known_ids]
        total = len(new_ids)

        batch_size = get_inbox_scan_batch_size()
        last_scanned_at = self._email_dao.last_scanned_at()
        run.set_meta({"current": min(batch_size, total), "total": total, "preparing": False, "last_scanned_at": last_scanned_at})
        logger.info("Probe complete: total=%d new=%d query=%r", len(all_ids), total, scan_query)

        if not new_ids:
            run.complete()
            return

        # Batch scan loop — pass ID slices directly, no query/pagination needed
        current = 0
        offset = 0

        while run.is_running() and offset < len(new_ids):
            batch_ids = new_ids[offset:offset + batch_size]

            try:
                result = await runtime.generate(
                    AgentName.INBOX_SCAN,
                    {"ids": batch_ids},
                    timeout=300.0,
                    retries=2,
                )
            except asyncio.CancelledError:
                return
            except AgentRunError as e:
                logger.error("Batch failed after all attempts, aborting scan: %s", e)
                run.fail("Batch failed after all attempts")
                return

            if not isinstance(result.output, dict):
                logger.error("Batch returned unexpected type %s, aborting scan", type(result.output).__name__)
                run.fail("Batch returned unexpected output")
                return

            scanned_emails = result.output.get("emails", [])
            offset += len(batch_ids)
            current += len(batch_ids)
            run.set_meta({"current": current, "total": total, "preparing": False})
            logger.info("Batch complete: emails=%d current=%d/%d", len(scanned_emails), current, total)

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

        run.complete()
