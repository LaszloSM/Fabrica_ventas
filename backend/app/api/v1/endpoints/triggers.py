from fastapi import APIRouter, Depends, Query, Request
from app.database import get_db
from app.services.prospect_service import ProspectService
from datetime import datetime
import uuid

router = APIRouter(prefix="/triggers", tags=["triggers"])

def _fmt(doc, prospect=None):
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = doc["_id"]
    if isinstance(d.get("detectedAt"), datetime):
        d["detectedAt"] = d["detectedAt"].isoformat()
    if isinstance(d.get("createdAt"), datetime):
        d["createdAt"] = d["createdAt"].isoformat()
    d["prospect"] = {"id": getattr(prospect, "id", ""), "name": getattr(prospect, "name", "")} if prospect else None
    return d

@router.get("")
async def list_triggers(
    prospectId: str = Query(None),
    db=Depends(get_db)
):
    query = {}
    if prospectId:
        query["prospectId"] = prospectId
    docs = await db["triggers"].find(query).sort("detectedAt", -1).to_list(length=100)
    prospect_svc = ProspectService(db)
    items = []
    for doc in docs:
        prospect = await prospect_svc.get_prospect(doc.get("prospectId", ""))
        items.append(_fmt(doc, prospect))
    return {"data": items}

@router.post("", status_code=201)
async def create_trigger(req: Request, db=Depends(get_db)):
    payload = await req.json()
    payload["_id"] = f"trigger_{uuid.uuid4().hex[:12]}"
    payload.setdefault("usedInOutreach", False)
    payload["detectedAt"] = datetime.utcnow()
    payload["createdAt"] = datetime.utcnow()
    await db["triggers"].insert_one(payload)
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(payload.get("prospectId", ""))
    return {"data": _fmt(payload, prospect)}

@router.patch("/{trigger_id}")
async def update_trigger(trigger_id: str, req: Request, db=Depends(get_db)):
    payload = await req.json()
    await db["triggers"].update_one({"_id": trigger_id}, {"$set": payload})
    doc = await db["triggers"].find_one({"_id": trigger_id})
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(doc.get("prospectId", "")) if doc else None
    return {"data": _fmt(doc, prospect) if doc else None}
