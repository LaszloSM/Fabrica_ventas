from fastapi import APIRouter, Depends, Query, Request
from app.database import get_db
from app.services.prospect_service import ProspectService
from datetime import datetime
import uuid

router = APIRouter(prefix="/activities", tags=["activities"])

def _fmt(doc, prospect=None):
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = doc["_id"]
    for f in ("doneAt", "createdAt"):
        if isinstance(d.get(f), datetime):
            d[f] = d[f].isoformat()
    if prospect:
        d["prospect"] = {"id": getattr(prospect, "id", ""), "name": getattr(prospect, "name", "")}
    else:
        d.setdefault("prospect", None)
    d.setdefault("deal", None)
    d.setdefault("createdBy", None)
    return d

@router.get("")
async def list_activities(
    dealId: str = Query(None),
    prospectId: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50),
    db=Depends(get_db)
):
    query = {}
    if dealId:
        query["dealId"] = dealId
    if prospectId:
        query["prospectId"] = prospectId
    docs = await db["activities"].find(query).sort("doneAt", -1).skip(skip).limit(limit).to_list(length=limit)
    prospect_svc = ProspectService(db)
    items = []
    for doc in docs:
        prospect = None
        if doc.get("prospectId"):
            prospect = await prospect_svc.get_prospect(doc["prospectId"])
        items.append(_fmt(doc, prospect))
    return {"data": items}

@router.post("", status_code=201)
async def create_activity(req: Request, db=Depends(get_db)):
    payload = await req.json()
    user_id = req.headers.get("x-user-id", "user_default")
    payload["_id"] = f"activity_{uuid.uuid4().hex[:12]}"
    payload["createdById"] = user_id
    payload["doneAt"] = datetime.utcnow()
    payload["createdAt"] = datetime.utcnow()
    await db["activities"].insert_one(payload)
    prospect_svc = ProspectService(db)
    prospect = None
    if payload.get("prospectId"):
        prospect = await prospect_svc.get_prospect(payload["prospectId"])
    return {"data": _fmt(payload, prospect)}
