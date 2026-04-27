from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_db
from app.models.goal import Goal
from datetime import datetime
import uuid

router = APIRouter(prefix="/goals", tags=["goals"])

@router.get("")
async def list_goals(
    year: int = Query(None),
    db=Depends(get_db),
):
    query = {}
    if year is not None:
        query["year"] = year
    docs = await db["goals"].find(query).sort("quarter", 1).to_list(length=200)
    return {
        "data": [
            {**{k: v for k, v in d.items() if k != "_id"}, "id": d["_id"]}
            for d in docs
        ]
    }

@router.post("")
async def create_goal(payload: Goal, db=Depends(get_db)):
    doc = payload.model_dump(by_alias=True, exclude={"id"})
    doc["_id"] = f"goal_{payload.serviceType}_{payload.year}_Q{payload.quarter}_{uuid.uuid4().hex[:6]}"
    doc["createdAt"] = datetime.utcnow()
    doc["updatedAt"] = datetime.utcnow()
    await db["goals"].insert_one(doc)
    return {
        "data": {**{k: v for k, v in doc.items() if k != "_id"}, "id": doc["_id"]}
    }

@router.put("/{goal_id}")
async def update_goal(goal_id: str, payload: Goal, db=Depends(get_db)):
    existing = await db["goals"].find_one({"_id": goal_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    update_data = payload.model_dump(by_alias=True, exclude={"id", "_id"}, exclude_unset=True)
    update_data["updatedAt"] = datetime.utcnow()
    await db["goals"].update_one({"_id": goal_id}, {"$set": update_data})
    updated = await db["goals"].find_one({"_id": goal_id})
    return {
        "data": {**{k: v for k, v in updated.items() if k != "_id"}, "id": updated["_id"]}
    }

@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, db=Depends(get_db)):
    result = await db["goals"].delete_one({"_id": goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return {"data": {"deleted": True}}
