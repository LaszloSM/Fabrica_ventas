"""
Endpoint de importación masiva desde múltiples CSVs locales.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_db
from app.services.import_service import ImportService

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/comprehensive")
async def import_comprehensive(
    force: bool = Query(False, description="Forzar reimportación eliminando datos existentes"),
    db=Depends(get_db),
):
    """
    Importa datos desde los 6 CSVs en /data:
    - Extrae vendedores dinámicamente y los crea como team_members
    - Deduplica contactos por email
    - Crea prospects, contacts, deals y activities
    - Datos 2025 se marcan como archivados
    """
    service = ImportService(db)
    result = await service.import_all(force=force)
    
    if result.get("error"):
        raise HTTPException(status_code=409, detail=result["message"])
    
    return {"data": result["data"]}


@router.get("/status")
async def import_status(db=Depends(get_db)):
    """Devuelve el estado actual de la base de datos."""
    stats = {
        "prospects": await db["prospects"].count_documents({}),
        "contacts": await db["contacts"].count_documents({}),
        "deals": await db["deals"].count_documents({}),
        "activities": await db["activities"].count_documents({}),
        "team_members": await db["team_members"].count_documents({"isActive": True}),
        "archived_deals": await db["deals"].count_documents({"archived": True}),
    }
    return {"data": stats}
