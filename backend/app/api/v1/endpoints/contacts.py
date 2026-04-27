from fastapi import APIRouter, Depends, Query, Request, HTTPException
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100),
    search: str = Query(""),
    db=Depends(get_db)
):
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    docs = await db["contacts"].find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db["contacts"].count_documents(query)
    items = []
    for doc in docs:
        doc["id"] = doc.pop("_id", doc.get("id", ""))
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


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: str, db=Depends(get_db)):
    result = await db["contacts"].delete_one({"_id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
