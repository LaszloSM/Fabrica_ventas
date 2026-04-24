from fastapi import APIRouter, Depends, Query
from app.database import get_db
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/role")
async def get_or_create_role(email: str = Query(...), db=Depends(get_db)):
    """
    Returns user role. Creates user if not exists.
    First user in DB becomes ADMIN; subsequent users become SALES.
    Uses email as string _id for Cosmos DB compatibility.
    """
    users_col = db["users"]
    user = await users_col.find_one({"email": email})
    if user:
        return {"data": {"role": user.get("role", "SALES")}}

    count = await users_col.count_documents({})
    role = "ADMIN" if count == 0 else "SALES"

    await users_col.insert_one({
        "_id": email,
        "email": email,
        "role": role,
        "createdAt": datetime.utcnow(),
    })
    return {"data": {"role": role}}
