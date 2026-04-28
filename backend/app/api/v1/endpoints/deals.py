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

    # Prospect (dict from MongoDB)
    if prospect:
        out["prospect"] = {
            "id": prospect.get("id", prospect.get("_id", "")),
            "name": prospect.get("name", ""),
            "industry": prospect.get("industry", None),
            "region": prospect.get("region", None),
            "segment": prospect.get("segment", None),
        }
    else:
        out.setdefault("prospect", None)

    # Contact (dict from MongoDB)
    if contact:
        out["contact"] = {
            "id": contact.get("id", contact.get("_id", "")),
            "name": contact.get("name", ""),
            "email": contact.get("email", None),
            "phone": contact.get("phone", None),
            "role": contact.get("role", None),
        }
    else:
        out.setdefault("contact", None)

    # Assigned user (dict from MongoDB)
    if assigned_user:
        out["assignedUser"] = {
            "id": assigned_user.get("id", assigned_user.get("_id", "")),
            "name": assigned_user.get("name", ""),
            "email": assigned_user.get("email", None),
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

    # Collect only the IDs we actually need for this page
    prospect_ids = list({d.prospectId for d in deals if d.prospectId})
    contact_ids = list({d.contactId for d in deals if d.contactId})
    assigned_ids = list({d.assignedTo for d in deals if d.assignedTo})
    deal_ids = list({d.id for d in deals if d.id})

    # Fetch only needed prospects one-by-one (Cosmos DB $in on _id is unreliable)
    prospects = {}
    for pid in prospect_ids:
        doc = await db["prospects"].find_one({"_id": pid})
        if doc:
            doc["id"] = doc["_id"]
            prospects[pid] = doc

    # Fetch only needed contacts
    contacts = {}
    for cid in contact_ids:
        doc = await db["contacts"].find_one({"_id": cid})
        if doc:
            doc["id"] = doc["_id"]
            contacts[cid] = doc

    # Fetch only needed team members
    team_members = {}
    for uid in assigned_ids:
        doc = await db["team_members"].find_one({"_id": uid})
        if doc:
            doc["id"] = doc["_id"]
            team_members[uid] = doc

    # Batch fetch activities for this page's deals
    activities_by_deal: dict = {did: [] for did in deal_ids}
    if deal_ids:
        async for doc in db["activities"].find({"dealId": {"$in": deal_ids}}).sort("doneAt", -1).limit(len(deal_ids) * 5):
            doc["id"] = doc["_id"]
            did = doc.get("dealId")
            if did and did in activities_by_deal:
                if len(activities_by_deal[did]) < 5:
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
    # Stamp valueSetAt whenever a user explicitly sets a value
    if 'value' in update_data and update_data['value'] is not None:
        update_data['valueSetAt'] = datetime.utcnow()
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


from pydantic import BaseModel as _BaseModel

class _MoveStageBody(_BaseModel):
    stage: str

@router.post("/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    body: _MoveStageBody,
    req: Request,
    service: DealService = Depends(get_deal_service)
):
    user_id = req.headers.get("x-user-id", "user_default")
    deal = await service.move_to_stage(deal_id, body.stage, user_id)
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


SEED_VALUES = {150_000_000.0, 35_000_000.0}

@router.post("/admin/reset-values")
async def reset_seed_values(
    req: Request,
    dry_run: bool = Query(False, description="Si true, reporta sin modificar"),
    db=Depends(get_db)
):
    """
    SUPERADMIN only. Resetea valores de deals que provienen de seed/import y
    nunca fueron editados por un usuario real. Usa dry_run=true para previsualizar.
    """
    requester_role = req.headers.get("x-user-role", "")
    if requester_role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPERADMIN puede ejecutar esta acción")

    query = {
        "valueSetAt": None,
        "$or": [
            {"value": {"$in": list(SEED_VALUES)}},
            {"source": "csv_import"},
        ]
    }

    count = await db["deals"].count_documents(query)

    if dry_run:
        return {"data": {"dry_run": True, "would_reset": count, "modified": 0}}

    result = await db["deals"].update_many(
        query,
        {"$set": {"value": None, "ponderatedValue": None, "updatedAt": datetime.utcnow()}}
    )

    return {"data": {"dry_run": False, "modified": result.modified_count, "skipped": count - result.modified_count}}
