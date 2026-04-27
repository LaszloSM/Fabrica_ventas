from fastapi import APIRouter, Depends, Query, Request, HTTPException
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/users", tags=["users"])


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


@router.get("/me")
async def get_or_create_me(req: Request, db=Depends(get_db)):
    """
    Called by Express server on every Google login.
    Gets or creates user by email from x-user-email header.
    Returns { role, id } for the session.
    """
    email = req.headers.get("x-user-email", "")
    name = req.headers.get("x-user-name", "")
    if not email:
        raise HTTPException(status_code=400, detail="x-user-email header required")

    users_col = db["users"]
    user = await users_col.find_one({"email": email})
    if user:
        return {"role": user.get("role", "SALES"), "id": str(user.get("_id", email))}

    # First user becomes ADMIN
    count = await users_col.count_documents({})
    role = "ADMIN" if count == 0 else "SALES"
    name_clean = name or email.split("@")[0].replace(".", " ").replace("_", " ").title()

    await users_col.insert_one({
        "_id": email,
        "email": email,
        "name": name_clean,
        "role": role,
        "createdAt": datetime.utcnow(),
    })

    # Auto-create team_member
    existing_team = await db["team_members"].find_one({"email": email})
    if not existing_team:
        await db["team_members"].insert_one({
            "_id": _id("tm"),
            "name": name_clean,
            "email": email,
            "role": "SALES_REP",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })

    return {"role": role, "id": email}


@router.get("")
async def list_users(db=Depends(get_db)):
    """Lists all system users."""
    users_col = db["users"]
    users = await users_col.find({}).to_list(length=100)
    for u in users:
        u["id"] = str(u.pop("_id"))
    return {"data": users}


@router.post("/role")
async def get_or_create_role(email: str = Query(...), db=Depends(get_db)):
    """
    Returns user role. Creates user if not exists.
    First user in DB becomes ADMIN; subsequent users become SALES.
    Uses email as string _id for Cosmos DB compatibility.
    Also creates a team_member automatically so the user appears in the sales team.
    """
    users_col = db["users"]
    user = await users_col.find_one({"email": email})
    if user:
        return {"data": {"role": user.get("role", "SALES")}}

    count = await users_col.count_documents({})
    role = "ADMIN" if count == 0 else "SALES"

    # Extract name from email (e.g., "juan.perez@coimpactob.org" -> "Juan Perez")
    name_from_email = email.split("@")[0].replace(".", " ").replace("_", " ").title()

    await users_col.insert_one({
        "_id": email,
        "email": email,
        "role": role,
        "createdAt": datetime.utcnow(),
    })

    # Auto-create team member for this user
    existing_team = await db["team_members"].find_one({"email": email})
    if not existing_team:
        await db["team_members"].insert_one({
            "_id": _id("tm"),
            "name": name_from_email,
            "email": email,
            "role": "SALES_REP",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })

    return {"data": {"role": role}}


@router.post("/sync-team")
async def sync_users_to_team(db=Depends(get_db)):
    """
    Syncs all system users to team members.
    Creates team_member for any user that doesn't have one.
    """
    users_col = db["users"]
    team_col = db["team_members"]
    
    users = await users_col.find({}).to_list(length=100)
    created = 0
    skipped = 0
    
    for user in users:
        email = user.get("email")
        if not email:
            continue
            
        existing = await team_col.find_one({"email": email})
        if existing:
            skipped += 1
            continue
        
        name_from_email = email.split("@")[0].replace(".", " ").replace("_", " ").title()
        
        await team_col.insert_one({
            "_id": _id("tm"),
            "name": name_from_email,
            "email": email,
            "role": "SALES_REP",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })
        created += 1
    
    return {"data": {"created": created, "skipped": skipped}}
