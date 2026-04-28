from fastapi import APIRouter, Depends, Query, Request, HTTPException
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/contacts", tags=["contacts"])

VALID_SEQUENCE_STEPS = {
    "linkedinInviteSent", "linkedinAccepted", "linkedinMessage",
    "email1", "email2", "email3", "whatsapp", "call",
    "firstMeeting", "followUpEmail", "proposalPrep", "proposalMeeting",
}

STEP_ACTIVITY_TYPE = {
    "linkedinInviteSent": "LINKEDIN_INVITE",
    "linkedinAccepted":   "LINKEDIN_ACCEPTED",
    "linkedinMessage":    "LINKEDIN_MESSAGE",
    "email1":             "EMAIL",
    "email2":             "EMAIL",
    "email3":             "EMAIL",
    "whatsapp":           "WHATSAPP",
    "call":               "CALL",
    "firstMeeting":       "MEETING",
    "followUpEmail":      "EMAIL",
    "proposalPrep":       "INTERNAL",
    "proposalMeeting":    "MEETING",
}


@router.get("/countries")
async def list_countries(db=Depends(get_db)):
    """Retorna lista ordenada de países únicos en la colección de contactos."""
    pipeline = [
        {"$match": {"country": {"$ne": None, "$exists": True}}},
        {"$group": {"_id": "$country"}},
        {"$sort": {"_id": 1}},
    ]
    results = await db["contacts"].aggregate(pipeline).to_list(length=200)
    return {"data": [r["_id"] for r in results if r["_id"]]}


@router.get("")
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100),
    search: str = Query(""),
    temperature: str = Query(""),
    country: str = Query(""),
    db=Depends(get_db)
):
    query: dict = {}
    if search:
        query["$or"] = [
            {"name":        {"$regex": search, "$options": "i"}},
            {"email":       {"$regex": search, "$options": "i"}},
            {"city":        {"$regex": search, "$options": "i"}},
            {"country":     {"$regex": search, "$options": "i"}},
            {"impactAreas": {"$regex": search, "$options": "i"}},
        ]
    if temperature:
        query["temperature"] = temperature.upper()
    if country:
        query["country"] = {"$regex": country, "$options": "i"}

    docs = await db["contacts"].find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db["contacts"].count_documents(query)

    # Enrich with prospect name
    prospect_ids = list({d["prospectId"] for d in docs if d.get("prospectId")})
    prospects = {}
    for pid in prospect_ids:
        p = await db["prospects"].find_one({"_id": pid}, {"name": 1})
        if p:
            prospects[pid] = p["name"]

    items = []
    for doc in docs:
        doc["id"] = doc.pop("_id", doc.get("id", ""))
        doc["prospectName"] = prospects.get(doc.get("prospectId", ""), None)
        items.append(doc)

    return {"data": items, "total": total}


@router.post("", status_code=201)
async def create_contact(req: Request, db=Depends(get_db)):
    payload = await req.json()
    payload["_id"] = f"contact_{uuid.uuid4().hex[:12]}"
    payload["createdAt"] = datetime.utcnow()
    payload["updatedAt"] = datetime.utcnow()
    await db["contacts"].insert_one(payload)
    payload["id"] = payload["_id"]
    return {"data": payload}


@router.get("/{contact_id}")
async def get_contact(contact_id: str, db=Depends(get_db)):
    doc = await db["contacts"].find_one({"_id": contact_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    doc["id"] = doc["_id"]
    return {"data": doc}


@router.patch("/{contact_id}")
async def update_contact(contact_id: str, req: Request, db=Depends(get_db)):
    payload = await req.json()
    payload["updatedAt"] = datetime.utcnow()
    result = await db["contacts"].update_one({"_id": contact_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    doc = await db["contacts"].find_one({"_id": contact_id})
    doc["id"] = doc["_id"]
    return {"data": doc}


@router.post("/{contact_id}/sequence/{step}")
async def toggle_sequence_step(
    contact_id: str,
    step: str,
    req: Request,
    db=Depends(get_db)
):
    """
    Marca o desmarca un paso de secuencia en un contacto.
    Al marcar como done=true, crea o actualiza una Actividad (deduplicada por contactId+type).
    """
    if step not in VALID_SEQUENCE_STEPS:
        raise HTTPException(status_code=400, detail=f"Paso inválido. Opciones: {sorted(VALID_SEQUENCE_STEPS)}")

    contact = await db["contacts"].find_one({"_id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    body = await req.json()
    done: bool = bool(body.get("done", True))
    now = datetime.utcnow()
    user_id = req.headers.get("x-user-id", "unknown")

    seq = contact.get("sequence") or {}
    seq[step] = {"done": done, "doneAt": now.isoformat() if done else None}

    await db["contacts"].update_one(
        {"_id": contact_id},
        {"$set": {"sequence": seq, "updatedAt": now}}
    )

    if done:
        activity_type = STEP_ACTIVITY_TYPE.get(step, "OTHER")

        # Resolve dealId: most recently updated active deal for this contact's prospect
        deal_id = None
        if contact.get("prospectId"):
            deal = await db["deals"].find_one(
                {
                    "prospectId": contact["prospectId"],
                    "stage": {"$nin": ["GANADO", "PERDIDO"]},
                    "deleted": {"$ne": True},
                },
                sort=[("updatedAt", -1)]
            )
            if deal:
                deal_id = deal["_id"]

        # Upsert: find existing activity for this (contactId, type) pair
        existing = await db["activities"].find_one({
            "contactId": contact_id,
            "type": f"SEQ_{step.upper()}",
        })
        if existing:
            await db["activities"].update_one(
                {"_id": existing["_id"]},
                {"$set": {"doneAt": now, "dealId": deal_id, "updatedAt": now}}
            )
        else:
            activity_id = f"act_{uuid.uuid4().hex[:12]}"
            await db["activities"].insert_one({
                "_id": activity_id,
                "contactId": contact_id,
                "dealId": deal_id,
                "prospectId": contact.get("prospectId"),
                "type": f"SEQ_{step.upper()}",
                "notes": f"Secuencia: {step}",
                "doneAt": now,
                "createdById": user_id,
                "createdAt": now,
            })

    doc = await db["contacts"].find_one({"_id": contact_id})
    doc["id"] = doc["_id"]
    return {"data": doc}


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: str, db=Depends(get_db)):
    result = await db["contacts"].delete_one({"_id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
