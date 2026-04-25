from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.schemas.deal import DealCreate, DealUpdate
from app.services.deal_service import DealService
from app.services.prospect_service import ProspectService

router = APIRouter(prefix="/deals", tags=["deals"])

async def get_deal_service(db=Depends(get_db)):
    return DealService(db)


def _enrich(deal_dict: dict, prospect=None, contact=None, assigned_user=None, activities=None) -> dict:
    """Añade relaciones y normaliza el dict para el frontend."""
    out = {k: v for k, v in deal_dict.items() if k != "_id"}
    if "id" not in out and "_id" in deal_dict:
        out["id"] = deal_dict["_id"]

    # Prospect
    if prospect:
        out["prospect"] = {
            "id": getattr(prospect, "id", ""),
            "name": getattr(prospect, "name", ""),
            "industry": getattr(prospect, "industry", None),
            "region": getattr(prospect, "region", None),
            "segment": getattr(prospect, "segment", None),
        }
    else:
        out.setdefault("prospect", None)

    # Contact
    if contact:
        out["contact"] = {
            "id": getattr(contact, "id", ""),
            "name": getattr(contact, "name", ""),
            "email": getattr(contact, "email", None),
            "phone": getattr(contact, "phone", None),
            "role": getattr(contact, "role", None),
        }
    else:
        out.setdefault("contact", None)

    # Assigned user
    if assigned_user:
        out["assignedUser"] = {
            "id": getattr(assigned_user, "id", ""),
            "name": getattr(assigned_user, "name", ""),
            "email": getattr(assigned_user, "email", None),
        }
    else:
        out.setdefault("assignedUser", None)

    # Activities
    out["activities"] = activities or []

    return out


@router.post("", status_code=201)
async def create_deal(
    req: Request,
    deal_data: DealCreate,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    user_id = req.headers.get("x-user-id", "user_default")
    try:
        deal = await service.create_deal(deal_data.model_dump(), user_id)
        d = deal.model_dump(by_alias=True)
        prospect_svc = ProspectService(db)
        prospect = await prospect_svc.get_prospect(deal.prospectId)
        return {"data": _enrich(d, prospect)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    stage: Optional[str] = Query(None),
    owner: Optional[str] = Query(None),
    line: Optional[str] = Query(None),
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    deals, total = await service.list_deals(skip, limit, stage, owner, line)

    # Pre-fetch all related data efficiently
    prospect_ids = {d.prospectId for d in deals if d.prospectId}
    contact_ids = {d.contactId for d in deals if d.contactId}
    assigned_ids = {d.assignedTo for d in deals if d.assignedTo}
    deal_ids = {d.id for d in deals if d.id}

    # Batch fetch prospects
    prospects = {}
    if prospect_ids:
        async for doc in db["prospects"].find({"_id": {"$in": list(prospect_ids)}}):
            doc["id"] = doc["_id"]
            prospects[doc["_id"]] = doc

    # Batch fetch contacts
    contacts = {}
    if contact_ids:
        async for doc in db["contacts"].find({"_id": {"$in": list(contact_ids)}}):
            doc["id"] = doc["_id"]
            contacts[doc["_id"]] = doc

    # Batch fetch team members (assigned users)
    team_members = {}
    if assigned_ids:
        async for doc in db["team_members"].find({"_id": {"$in": list(assigned_ids)}}):
            doc["id"] = doc["_id"]
            team_members[doc["_id"]] = doc

    # Batch fetch activities (last 5 per deal)
    activities_by_deal = {}
    if deal_ids:
        async for doc in db["activities"].find({"dealId": {"$in": list(deal_ids)}}).sort("doneAt", -1).limit(len(deal_ids) * 5):
            doc["id"] = doc["_id"]
            did = doc.get("dealId")
            if did:
                if did not in activities_by_deal:
                    activities_by_deal[did] = []
                activities_by_deal[did].append(doc)

    items = []
    for deal in deals:
        d = deal.model_dump(by_alias=True)
        prospect = prospects.get(deal.prospectId)
        contact = contacts.get(deal.contactId) if deal.contactId else None
        assigned_user = team_members.get(deal.assignedTo) if deal.assignedTo else None
        activities = activities_by_deal.get(deal.id, [])[:5]
        enriched = _enrich(d, prospect, contact, assigned_user, activities)
        items.append(enriched)

    return {"data": items, "total": total}


@router.get("/aging/")
async def get_aging_deals(
    days: int = Query(14, ge=1),
    service: DealService = Depends(get_deal_service)
):
    deals = await service.get_aging_deals(days)
    return {"data": [d.model_dump(by_alias=True) for d in deals]}


@router.get("/by-owner/{user_id}")
async def get_deals_by_owner(
    user_id: str,
    service: DealService = Depends(get_deal_service)
):
    deals, _ = await service.list_deals(owner=user_id)
    return {"data": [d.model_dump(by_alias=True) for d in deals]}


@router.get("/{deal_id}")
async def get_deal(
    deal_id: str,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    deal = await service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")

    # Fetch relations
    prospect = None
    contact = None
    assigned_user = None
    activities = []

    if deal.prospectId:
        doc = await db["prospects"].find_one({"_id": deal.prospectId})
        if doc:
            doc["id"] = doc["_id"]
            prospect = doc

    if deal.contactId:
        doc = await db["contacts"].find_one({"_id": deal.contactId})
        if doc:
            doc["id"] = doc["_id"]
            contact = doc

    if deal.assignedTo:
        doc = await db["team_members"].find_one({"_id": deal.assignedTo})
        if doc:
            doc["id"] = doc["_id"]
            assigned_user = doc

    async for doc in db["activities"].find({"dealId": deal_id}).sort("doneAt", -1).limit(20):
        doc["id"] = doc["_id"]
        activities.append(doc)

    return {"data": _enrich(deal.model_dump(by_alias=True), prospect, contact, assigned_user, activities)}


@router.put("/{deal_id}")
@router.patch("/{deal_id}")
async def update_deal(
    deal_id: str,
    req: Request,
    deal_update: DealUpdate,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    update_data = deal_update.model_dump(exclude_unset=True)
    deal = await service.update_deal(deal_id, update_data)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(deal.prospectId)
    return {"data": _enrich(deal.model_dump(by_alias=True), prospect)}


@router.delete("/{deal_id}", status_code=204)
async def delete_deal(deal_id: str, service: DealService = Depends(get_deal_service)):
    deal = await service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    await service.update_deal(deal_id, {"deleted": True})


@router.post("/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    new_stage: str,
    req: Request,
    service: DealService = Depends(get_deal_service)
):
    user_id = req.headers.get("x-user-id", "user_default")
    deal = await service.move_to_stage(deal_id, new_stage, user_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}


@router.post("/{deal_id}/mark-won")
async def mark_deal_won(deal_id: str, service: DealService = Depends(get_deal_service)):
    deal = await service.mark_won(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}


@router.post("/{deal_id}/mark-lost")
async def mark_deal_lost(
    deal_id: str,
    reason: str = Query(...),
    service: DealService = Depends(get_deal_service)
):
    deal = await service.mark_lost(deal_id, reason)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}
