"""OpportunityService — AI-driven opportunity operations."""

import logging

logger = logging.getLogger(__name__)

from api.services.ai import AgentRunError, AgentRun, AgentName

from api.db import OpportunityDAO, ProfileDAO, WorkExperienceDAO
from api.db.daos.opportunity.base.opportunity_embedding_dao import OpportunityEmbeddingDAO
from api.db.daos.opportunity.base.opportunity_similarity_dao import OpportunitySimilarityDAO
from api.db.daos.opportunity.meta.attachment_dao import AttachmentDAO
from api.models.entities.opportunity.base.opportunity import (
    OpportunityStatus, OpportunityType, ScoreExplanation,
    JobContractType, JobWorkMode, JobPayPeriod,
    ProjectType, EducationType, EducationLevel, NetworkingType, LearningType,
)
from api.models.entities.opportunity.meta.attachment import AttachmentType

_ENUM_FIELDS = {
    "status": OpportunityStatus,
    "job_contract_type": JobContractType,
    "job_work_mode": JobWorkMode,
    "job_pay_period": JobPayPeriod,
    "project_type": ProjectType,
    "education_type": EducationType,
    "education_level": EducationLevel,
    "networking_type": NetworkingType,
    "learning_type": LearningType,
}
def _parse_version_fields(data: dict) -> dict:
    result = {}
    for k, v in data.items():
        if k in _ENUM_FIELDS:
            try:
                result[k] = _ENUM_FIELDS[k](v)
            except ValueError:
                pass  # skip invalid agent output rather than raising
        elif k == "score_explanation":
            if isinstance(v, dict):
                try:
                    result[k] = ScoreExplanation.model_validate(v)
                except Exception as e:
                    logger.warning("score_explanation validation failed: %s; raw=%r", e, v)
            elif isinstance(v, str):
                # Legacy: agent returned serialized JSON string — try to salvage
                import json as _json
                try:
                    result[k] = ScoreExplanation.model_validate(_json.loads(v))
                except Exception as e:
                    logger.warning("score_explanation legacy-string parse failed: %s", e)
        else:
            result[k] = v
    return result


class OpportunityService:

    def __init__(self) -> None:
        from api.services.ai import runtime, embedding
        from api.services.files import FileService
        from api.config import ROOT, get_attachment_path
        self._runtime = runtime
        self._embedding = embedding
        self._files = FileService(ROOT / get_attachment_path())
        self._opp_dao = OpportunityDAO()
        self._profile_dao = ProfileDAO()
        self._work_experience_dao = WorkExperienceDAO()
        self._attach_dao = AttachmentDAO()
        self._embedding_dao = OpportunityEmbeddingDAO()
        self._similarity_dao = OpportunitySimilarityDAO()

    def source(self, opportunity_id: str) -> AgentRun:
        """Start AI sourcing for an opportunity. Returns a handle to the run."""
        opportunity = self._opp_dao.get(opportunity_id)
        profile = self._profile_dao.get()
        work_experiences = self._work_experience_dao.list_for_profile(profile.id) if profile else []

        run = self._runtime.create(AgentName.SOURCE_OPPORTUNITY, external_id=opportunity_id)
        self._opp_dao.set_sourcing_started(opportunity_id, run.run_id)

        async def _run():
            try:
                result = await run.generate({
                    "opportunity": opportunity.model_dump(mode="json"),
                    "profile": profile.model_dump(mode="json") if profile else None,
                    "work_experiences": [we.model_dump(mode="json") for we in work_experiences] if work_experiences else [],
                }, timeout=180.0)
                sourced = result.output
            except BaseException:
                self._opp_dao.set_sourcing_completed(opportunity_id)
                run.fail()
                raise

            avatar_url = sourced.pop("avatar_url", None)
            organization_unit_name = sourced.pop("organization_unit_name", None)
            updates = {k: v for k, v in sourced.items() if v is not None}
            typed = _parse_version_fields(updates)
            # Guardrail: agent should emit 0–100; if it regressed to 0–10, scale up.
            score = typed.get("score")
            if isinstance(score, int) and 0 < score <= 10:
                logger.warning("score-guardrail: agent emitted %d on legacy 0–10 scale; scaling to %d", score, score * 10)
                typed["score"] = score * 10
            current = self._opp_dao.get(opportunity_id)
            enriched = current.model_copy(update={
                "active_version": current.active_version.model_copy(update=typed)
            })
            self._opp_dao.update(opportunity_id, enriched.active_version)
            if avatar_url:
                self._opp_dao.set_avatar_url(opportunity_id, avatar_url)
            self._opp_dao.set_sourcing_completed(opportunity_id)

            try:
                opp = self._opp_dao.get(opportunity_id)
                if opp and opp.active_version:
                    org = opp.active_version.organization_name
                    parts = [p for p in ([org] * 5 if org else []) + [opp.active_version.title, organization_unit_name] if p]
                    embed_str = " | ".join(parts)
                    if embed_str:
                        vector = await self._embedding.embed(embed_str)
                        self._embedding_dao.upsert(opportunity_id, vector)
                        similar = self._embedding_dao.find_similar(opportunity_id)
                        for similar_id, sim_score in similar:
                            self._similarity_dao.upsert(opportunity_id, similar_id, sim_score)
            except Exception:
                pass

            run.complete()

        self._runtime.run(run, _run())
        return run

    def generate_cover_letter(self, opportunity_id: str) -> AgentRun:
        """Generate a cover letter for an opportunity. Returns a handle to the run."""
        opportunity = self._opp_dao.get(opportunity_id)
        profile = self._profile_dao.get()
        work_experiences = self._work_experience_dao.list_for_profile(profile.id) if profile else []

        run = self._runtime.create(AgentName.GENERATE_ATTACHMENT, external_id=opportunity_id)

        async def _generate():
            try:
                result = await run.generate({
                    "attachment_type": "cover_letter",
                    "opportunity": opportunity.model_dump(mode="json"),
                    "profile": profile.model_dump(mode="json") if profile else None,
                    "work_experiences": [we.model_dump(mode="json") for we in work_experiences] if work_experiences else [],
                }, expects_json=False, timeout=180.0)
                md_content = result.output
            except Exception:
                run.fail()
                return

            import uuid
            from api.services.files import FileService
            existing = self._attach_dao.list_for_opportunity(opportunity_id)
            existing_titles = {a.title for a in existing if a.title}

            base_title = f"Cover Letter \u2013 {opportunity.active_version.title}"
            title = FileService.unique_name(base_title, lambda t: t in existing_titles)
            attachment_id = str(uuid.uuid4())
            file_path = f"{opportunity_id}/{attachment_id}.pdf"

            try:
                self._files.write_pdf(file_path, md_content)
            except RuntimeError:
                run.fail()
                return

            self._attach_dao.create(
                opportunity_id=opportunity_id,
                attachment_type=AttachmentType.MOTIVATION,
                file_path=file_path,
                file_type="application/pdf",
                title=title,
                attachment_id=attachment_id,
            )
            run.complete()

        self._runtime.run(run, _generate())
        return run

