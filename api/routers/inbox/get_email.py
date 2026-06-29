"""GET /inbox/{email_id} and POST /inbox/{email_id}/extract"""

from typing import List

from fastapi import APIRouter, HTTPException

from ...db import InboxEmailDAO, OpportunityDAO
from ...models import InboxEmail, Opportunity, OpportunityVersion, OpportunityStatus, OpportunityType
from ...services.ai import AgentName, AgentRunError, runtime

router = APIRouter(prefix="/inbox", tags=["inbox"])

email_dao = InboxEmailDAO()
opp_dao = OpportunityDAO()


@router.get("/{email_id}", response_model=InboxEmail)
def get_email(email_id: str):
    """Get a specific email."""
    email = email_dao.get(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.delete("/{email_id}", status_code=204)
def delete_email(email_id: str):
    """Delete a specific email."""
    email = email_dao.get(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email_dao.delete(email_id)


@router.post("/{email_id}/extract", response_model=List[Opportunity])
async def extract_opportunities(email_id: str):
    """Extract and save opportunities from an inbox email."""
    email = email_dao.get(email_id)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    email_content = f"From: {email.from_address}\nSubject: {email.subject}\n\n{email.body}"
    try:
        result = await runtime.generate(AgentName.EXTRACT_OPPORTUNITY, email_content, timeout=120.0)
        extracted = result.output
    except AgentRunError as e:
        raise HTTPException(status_code=500, detail=str(e))

    opportunities = [e for e in extracted if isinstance(e, dict) and e.get("is_opportunity") is not False]
    created = []
    for opp_data in opportunities:
        try:
            opp_type_str = opp_data.get("type", "job")
            try:
                opp_type = OpportunityType(opp_type_str)
            except ValueError:
                opp_type = OpportunityType.JOB

            status_raw = opp_data.get("status", "opened")
            try:
                status = OpportunityStatus(status_raw)
            except ValueError:
                status = OpportunityStatus.OPENED

            version = OpportunityVersion(
                status=status,
                title=opp_data.get("title", "Untitled"),
                description=opp_data.get("description"),
                location=opp_data.get("location"),
            )
            opp_id = opp_dao.create(
                opp_data.get("url") or None,
                opp_type,
                version,
            )
            created.append(opp_dao.get(opp_id))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create opportunity: {str(e)}")

    return created
