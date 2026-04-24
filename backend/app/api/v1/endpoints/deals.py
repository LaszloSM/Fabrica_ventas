from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.schemas.deal import DealCreate, DealUpdate, DealResponse
from app.services.deal_service import DealService

router = APIRouter(prefix="/deals", tags=["deals"])

async def get_deal_service(db=Depends(get_db)):
    return DealService(db)

@router.post("", response_model=DealResponse, status_code=201)
async def create_deal(
    deal_data: DealCreate,
    service: DealService = Depends(get_deal_service),
    user_id: str = "user_default"
):
    """Crear oportunidad con validaciones obligatorias"""
    try:
        deal = await service.create_deal(deal_data.dict(), user_id)
        return deal
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=dict)
async def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    stage: Optional[str] = Query(None),
    owner: Optional[str] = Query(None),
    line: Optional[str] = Query(None),
    service: DealService = Depends(get_deal_service)
):
    """Listar oportunidades con filtros"""
    deals, total = await service.list_deals(skip, limit, stage, owner, line)
    return {
        "items": deals,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(
    deal_id: str,
    service: DealService = Depends(get_deal_service)
):
    """Obtener deal específico"""
    deal = await service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return deal

@router.put("/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: str,
    deal_update: DealUpdate,
    service: DealService = Depends(get_deal_service)
):
    """Actualizar deal"""
    update_data = deal_update.dict(exclude_unset=True)
    deal = await service.update_deal(deal_id, update_data)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return deal

@router.delete("/{deal_id}", status_code=204)
async def delete_deal(
    deal_id: str,
    service: DealService = Depends(get_deal_service)
):
    """Eliminar deal (lógico)"""
    deal = await service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    await service.update_deal(deal_id, {"deleted": True})

@router.get("/by-owner/{user_id}", response_model=list)
async def get_deals_by_owner(
    user_id: str,
    service: DealService = Depends(get_deal_service)
):
    """Pipeline personal de responsable"""
    deals, _ = await service.list_deals(owner=user_id)
    return deals

@router.get("/aging/", response_model=list)
async def get_aging_deals(
    days: int = Query(14, ge=1),
    service: DealService = Depends(get_deal_service)
):
    """Oportunidades sin movimiento > X días"""
    deals = await service.get_aging_deals(days)
    return deals

@router.post("/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    new_stage: str,
    service: DealService = Depends(get_deal_service),
    user_id: str = "user_default"
):
    """Mover deal a nueva etapa"""
    deal = await service.move_to_stage(deal_id, new_stage, user_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"success": True, "deal": deal}

@router.post("/{deal_id}/mark-won")
async def mark_deal_won(
    deal_id: str,
    service: DealService = Depends(get_deal_service)
):
    """Marcar deal como ganada"""
    deal = await service.mark_won(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"success": True, "deal": deal}

@router.post("/{deal_id}/mark-lost")
async def mark_deal_lost(
    deal_id: str,
    reason: str = Query(...),
    service: DealService = Depends(get_deal_service)
):
    """Marcar deal como perdida"""
    deal = await service.mark_lost(deal_id, reason)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"success": True, "deal": deal}
