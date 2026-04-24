from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.models.team_member import TeamMemberCreate, TeamMemberUpdate
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/team", tags=["team"])

@router.get("")
async def list_team_members(db=Depends(get_db)):
    """Lista todos los miembros del equipo activos."""
    members = await db["team_members"].find({"isActive": True}).to_list(length=100)
    for m in members:
        m["id"] = str(m.pop("_id"))
    return {"data": members}

@router.post("")
async def create_team_member(member: TeamMemberCreate, db=Depends(get_db)):
    """Crea un nuevo miembro del equipo."""
    existing = await db["team_members"].find_one({"name": member.name})
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un miembro con ese nombre")
    
    doc = member.model_dump()
    doc["createdAt"] = datetime.utcnow()
    doc["updatedAt"] = datetime.utcnow()
    
    result = await db["team_members"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return {"data": doc}

@router.patch("/{member_id}")
async def update_team_member(member_id: str, member: TeamMemberUpdate, db=Depends(get_db)):
    """Actualiza un miembro del equipo."""
    update_data = {k: v for k, v in member.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await db["team_members"].update_one(
        {"_id": ObjectId(member_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    updated = await db["team_members"].find_one({"_id": ObjectId(member_id)})
    updated["id"] = str(updated.pop("_id"))
    return {"data": updated}

@router.delete("/{member_id}")
async def delete_team_member(member_id: str, db=Depends(get_db)):
    """Elimina (desactiva) un miembro del equipo si no tiene deals asignados."""
    # Verificar si tiene deals asignados
    deals_count = await db["deals"].count_documents({"assignedTo": member_id})
    if deals_count > 0:
        raise HTTPException(
            status_code=409, 
            detail=f"No se puede eliminar: tiene {deals_count} deals asignados"
        )
    
    result = await db["team_members"].update_one(
        {"_id": ObjectId(member_id)},
        {"$set": {"isActive": False, "updatedAt": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Miembro no encontrado")
    
    return {"data": {"message": "Miembro desactivado correctamente"}}
