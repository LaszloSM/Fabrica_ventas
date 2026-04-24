from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.database import get_db
from app.schemas.prospect import ProspectCreate, ProspectUpdate, ProspectResponse
from app.services.prospect_service import ProspectService

router = APIRouter(prefix="/prospects", tags=["prospects"])

async def get_prospect_service(db=Depends(get_db)):
    return ProspectService(db)

@router.post("", response_model=ProspectResponse, status_code=201)
async def create_prospect(
    prospect_data: ProspectCreate,
    service: ProspectService = Depends(get_prospect_service)
):
    """Crear prospect"""
    prospect = await service.create_prospect(prospect_data.dict())
    return prospect

@router.get("", response_model=dict)
async def list_prospects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(""),
    region: Optional[str] = Query(None),
    service: ProspectService = Depends(get_prospect_service)
):
    """Listar prospects con búsqueda y filtros"""
    prospects, total = await service.list_prospects(skip, limit, search, region)
    return {
        "items": prospects,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{prospect_id}", response_model=ProspectResponse)
async def get_prospect(
    prospect_id: str,
    service: ProspectService = Depends(get_prospect_service)
):
    """Obtener prospect específico"""
    prospect = await service.get_prospect(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect no encontrado")
    return prospect

@router.put("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: str,
    prospect_update: ProspectUpdate,
    service: ProspectService = Depends(get_prospect_service)
):
    """Actualizar prospect"""
    update_data = prospect_update.dict(exclude_unset=True)
    prospect = await service.update_prospect(prospect_id, update_data)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect no encontrado")
    return prospect

@router.delete("/{prospect_id}", status_code=204)
async def delete_prospect(
    prospect_id: str,
    service: ProspectService = Depends(get_prospect_service)
):
    """Eliminar prospect"""
    deleted = await service.delete_prospect(prospect_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prospect no encontrado")
