from fastapi import APIRouter, Depends, Query, Request
from app.database import get_db
from app.services.prospect_service import ProspectService
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/sequences", tags=["sequences"])

def _fmt_date(v):
    return v.isoformat() if isinstance(v, datetime) else v

def _fmt(doc, prospect=None, steps=None):
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = doc["_id"]
    for f in ("startedAt", "createdAt", "updatedAt"):
        if isinstance(d.get(f), datetime):
            d[f] = d[f].isoformat()
    d["prospect"] = {"id": getattr(prospect, "id", ""), "name": getattr(prospect, "name", "")} if prospect else None
    d["steps"] = steps or []
    d.setdefault("deal", None)
    d.setdefault("templateSequence", None)
    return d

async def _get_steps(db, sequence_id):
    docs = await db["sequence_steps"].find({"sequenceId": sequence_id}).sort("stepNumber", 1).to_list(length=None)
    steps = []
    for doc in docs:
        s = {k: v for k, v in doc.items() if k != "_id"}
        s["id"] = doc["_id"]
        for f in ("scheduledAt", "sentAt"):
            if isinstance(s.get(f), datetime):
                s[f] = s[f].isoformat()
        steps.append(s)
    return steps

@router.get("")
async def list_sequences(
    prospectId: str = Query(None),
    status: str = Query(None),
    db=Depends(get_db)
):
    query = {}
    if prospectId:
        query["prospectId"] = prospectId
    if status:
        query["status"] = status
    docs = await db["sequences"].find(query).sort("createdAt", -1).to_list(length=100)
    prospect_svc = ProspectService(db)
    items = []
    for doc in docs:
        prospect = await prospect_svc.get_prospect(doc.get("prospectId", ""))
        steps = await _get_steps(db, doc["_id"])
        items.append(_fmt(doc, prospect, steps))
    return {"data": items}

@router.post("", status_code=201)
async def create_sequence(req: Request, db=Depends(get_db)):
    payload = await req.json()
    seq_id = f"seq_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()
    doc = {
        "_id": seq_id,
        "prospectId": payload.get("prospectId", ""),
        "dealId": payload.get("dealId"),
        "templateSequenceId": payload.get("templateSequenceId"),
        "currentStep": 1,
        "status": "ACTIVE",
        "startedAt": now,
        "createdAt": now,
        "updatedAt": now,
    }
    await db["sequences"].insert_one(doc)

    # Generar steps si hay templateSequence
    steps = []
    if payload.get("templateSequenceId"):
        tmpl_seq = await db["template_sequences"].find_one({"_id": payload["templateSequenceId"]})
        if tmpl_seq:
            tmpl_steps = await db["template_sequence_steps"].find(
                {"templateSequenceId": payload["templateSequenceId"]}
            ).sort("stepNumber", 1).to_list(length=None)
            for ts in tmpl_steps:
                step_doc = {
                    "_id": f"step_{uuid.uuid4().hex[:12]}",
                    "sequenceId": seq_id,
                    "stepNumber": ts["stepNumber"],
                    "type": ts["type"],
                    "scheduledAt": now + timedelta(days=ts.get("dayOffset", 0)),
                    "sentAt": None,
                    "outcome": None,
                    "templateId": ts.get("templateId"),
                }
                await db["sequence_steps"].insert_one(step_doc)
                s = {k: v for k, v in step_doc.items() if k != "_id"}
                s["id"] = step_doc["_id"]
                s["scheduledAt"] = s["scheduledAt"].isoformat()
                steps.append(s)

    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(doc["prospectId"])
    return {"data": _fmt(doc, prospect, steps)}

@router.patch("/{sequence_id}")
async def update_sequence(sequence_id: str, req: Request, db=Depends(get_db)):
    payload = await req.json()
    payload["updatedAt"] = datetime.utcnow()
    await db["sequences"].update_one({"_id": sequence_id}, {"$set": payload})
    doc = await db["sequences"].find_one({"_id": sequence_id})
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(404, "Sequence no encontrada")
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(doc.get("prospectId", ""))
    steps = await _get_steps(db, sequence_id)
    return {"data": _fmt(doc, prospect, steps)}
