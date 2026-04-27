from fastapi import APIRouter, Depends, Query, Request, HTTPException, Body
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/users", tags=["users"])

ROLES = ["SUPERADMIN", "ADMIN", "SALES", "VIEWER"]

def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _fmt_user(doc: dict) -> dict:
    """Formatea un documento de user a response limpio."""
    return {
        "id": str(doc.get("_id", "")),
        "email": doc.get("email", ""),
        "name": doc.get("name", ""),
        "role": doc.get("role", "SALES"),
        "image": doc.get("image"),
        "createdAt": doc.get("createdAt"),
    }


@router.get("/me")
async def get_or_create_me(req: Request, db=Depends(get_db)):
    """
    Llamado por Express en cada login de Google.
    Obtiene o crea usuario por email.
    El primer usuario del sistema es SUPERADMIN.
    """
    email = req.headers.get("x-user-email", "")
    name = req.headers.get("x-user-name", "")
    if not email:
        raise HTTPException(status_code=400, detail="x-user-email header required")

    users_col = db["users"]
    user = await users_col.find_one({"email": email})

    if user:
        role = user.get("role", "SALES")

        # Si no hay SUPERADMIN, promover al mas antiguo
        if role != "SUPERADMIN":
            sa_count = await users_col.count_documents({"role": "SUPERADMIN"})
            if sa_count == 0:
                # Promover al mas antiguo
                oldest = await users_col.find_one(
                    {}, sort=[("createdAt", 1)]
                )
                if oldest and oldest.get("_id") == user["_id"]:
                    await users_col.update_one(
                        {"_id": user["_id"]},
                        {"$set": {"role": "SUPERADMIN"}}
                    )
                    role = "SUPERADMIN"

        return {"role": role, "id": str(user.get("_id", email))}

    # Nuevo usuario
    total_count = await users_col.count_documents({})
    role = "SUPERADMIN" if total_count == 0 else "SALES"
    name_clean = name or email.split("@")[0].replace(".", " ").replace("_", " ").title()

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    await users_col.insert_one({
        "_id": user_id,
        "email": email,
        "name": name_clean,
        "role": role,
        "createdAt": datetime.utcnow(),
    })

    # Crear team_member
    existing_tm = await db["team_members"].find_one({"email": email})
    if not existing_tm:
        await db["team_members"].insert_one({
            "_id": _id("tm"),
            "name": name_clean,
            "email": email,
            "role": "SALES_REP",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })

    return {"role": role, "id": user_id}


@router.get("")
async def list_users(db=Depends(get_db)):
    """Devuelve todos los usuarios del sistema mas team members que no han iniciado sesion."""
    users_col = db["users"]
    users = await users_col.find({}).to_list(length=200)

    by_email: dict = {}
    for u in users:
        d = _fmt_user(u)
        by_email[d["email"]] = d

    # Suplementar con team_members que nunca iniciaron sesion
    async for tm in db["team_members"].find({}):
        email = tm.get("email", "")
        if not email:
            continue
        if email not in by_email:
            by_email[email] = {
                "id": str(tm.get("_id", "")),
                "name": tm.get("name", email.split("@")[0]),
                "email": email,
                "role": "SALES",
                "image": None,
                "createdAt": tm.get("createdAt"),
            }
        elif not by_email[email].get("name"):
            by_email[email]["name"] = tm.get("name", email)

    result = sorted(by_email.values(), key=lambda x: x.get("name", ""))
    return {"data": result}


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: str,
    req: Request,
    db=Depends(get_db),
    payload: dict = Body(...),
):
    """Cambiar rol. SUPERADMIN puede todo. ADMIN gestiona SALES/VIEWER. Nadie puede degradar a un SUPERADMIN."""
    role = payload.get("role", "").upper()
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Rol invalido. Opciones: {ROLES}")

    requester_email = req.headers.get("x-user-email", "")
    requester = await db["users"].find_one({"email": requester_email})
    if not requester:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")

    requester_role = requester.get("role", "SALES")
    if requester_role not in ("SUPERADMIN", "ADMIN"):
        raise HTTPException(status_code=403, detail="Solo SUPERADMIN o ADMIN pueden cambiar roles")

    target = await db["users"].find_one({"_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    target_role = target.get("role", "SALES")

    # SUPERADMIN no puede ser degradado
    if target_role == "SUPERADMIN" and requester_role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Solo un SUPERADMIN puede modificar a otro SUPERADMIN")
    if target_role == "SUPERADMIN" and role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="No se puede degradar al SUPERADMIN")

    # ADMIN solo puede gestionar SALES y VIEWER
    if requester_role == "ADMIN" and target_role not in ("SALES", "VIEWER"):
        raise HTTPException(status_code=403, detail="ADMIN solo puede cambiar roles de SALES y VIEWER")
    if requester_role == "ADMIN" and role not in ("SALES", "VIEWER", "ADMIN"):
        raise HTTPException(status_code=403, detail="ADMIN no puede asignar ese rol")

    # No degradarse a si mismo
    if requester["_id"] == target["_id"]:
        raise HTTPException(status_code=400, detail="No podes cambiar tu propio rol")

    await db["users"].update_one(
        {"_id": user_id},
        {"$set": {"role": role, "updatedAt": datetime.utcnow()}}
    )
    return {"data": {"id": user_id, "role": role}}


@router.post("/ensure-admin")
async def ensure_admin(req: Request, db=Depends(get_db)):
    """Promueve al primer usuario como SUPERADMIN si no existe ninguno."""
    sa_count = await db["users"].count_documents({"role": "SUPERADMIN"})
    if sa_count > 0:
        return {"data": {"action": "none", "message": "Ya existe un SUPERADMIN"}}

    email = req.headers.get("x-user-email", "")
    user = await db["users"].find_one({"email": email})
    if not user:
        return {"data": {"action": "none", "message": "Usuario no encontrado"}}

    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"role": "SUPERADMIN", "updatedAt": datetime.utcnow()}}
    )
    return {"data": {"action": "promoted", "email": email, "message": "Usuario promovido a SUPERADMIN"}}
