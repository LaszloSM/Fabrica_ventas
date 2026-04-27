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
    limit: int = Query(200),
    db=Depends(get_db)
):
    query = {}
    if dealId:
        query["dealId"] = dealId
    if prospectId:
        query["prospectId"] = prospectId
    docs = await db["activities"].find(query).sort("doneAt", -1).skip(skip).limit(limit).to_list(length=limit)

    # Collect all unique createdById values for batch lookup
    creator_ids = {doc.get("createdById") for doc in docs if doc.get("createdById")}
    creator_names: dict = {}
    if creator_ids:
        # Look in users collection first
        async for u in db["users"].find({"_id": {"$in": list(creator_ids)}}):
            creator_names[u["_id"]] = u.get("name") or u.get("email", u["_id"])
        # Fill missing from team_members (by email)
        missing = creator_ids - set(creator_names.keys())
        if missing:
            async for tm in db["team_members"].find({"email": {"$in": list(missing)}}):
                creator_names[tm.get("email", "")] = tm.get("name", tm.get("email", ""))

    prospect_svc = ProspectService(db)
    items = []
    for doc in docs:
        prospect = None
        if doc.get("prospectId"):
            prospect = await prospect_svc.get_prospect(doc["prospectId"])
        item = _fmt(doc, prospect)
        # Resolve creator name
        cid = doc.get("createdById")
        if cid:
            item["createdByName"] = creator_names.get(cid, cid)
        items.append(item)
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
