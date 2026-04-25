from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.schemas.deal import DealCreate, DealUpdate
from app.services.deal_service import DealService
from app.services.prospect_service import ProspectService

router = APIRouter(prefix="/deals", tags=["deals"])

async def get_deal_service(db=Depends(get_db)):
    return DealService(db)

def _enrich(deal_dict: dict, prospect=None) -> dict:
    """Añade relaciones y normaliza el dict para el frontend."""
    out = {k: v for k, v in deal_dict.items() if k != "_id"}
    if "id" not in out and "_id" in deal_dict:
        out["id"] = deal_dict["_id"]
    if prospect:
        out["prospect"] = {"id": getattr(prospect, "id", ""), "name": getattr(prospect, "name", "")}
    else:
        out.setdefault("prospect", None)
    out.setdefault("contact", None)
    out.setdefault("assignedUser", None)
    out.setdefault("activities", [])
    return out

@router.post("", status_code=201)
async def create_deal(
    req: Request,
    deal_data: DealCreate,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    user_id = req.headers.get("x-user-id", "user_default")
    try:
        deal = await service.create_deal(deal_data.model_dump(), user_id)
        d = deal.model_dump(by_alias=True)
        prospect_svc = ProspectService(db)
        prospect = await prospect_svc.get_prospect(deal.prospectId)
        return {"data": _enrich(d, prospect)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
async def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    stage: Optional[str] = Query(None),
    owner: Optional[str] = Query(None),
    line: Optional[str] = Query(None),
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    deals, total = await service.list_deals(skip, limit, stage, owner, line)
    print(f"[DEBUG] list_deals: found {len(deals)} deals, total={total}")
    prospect_svc = ProspectService(db)
    items = []
    for deal in deals:
        d = deal.model_dump(by_alias=True)
        prospect = await prospect_svc.get_prospect(deal.prospectId)
        enriched = _enrich(d, prospect)
        print(f"[DEBUG] enriched deal: id={enriched.get('id')}, stage={enriched.get('stage')}, prospect={enriched.get('prospect')}")
        items.append(enriched)
    print(f"[DEBUG] returning {len(items)} items")
    return {"data": items, "total": total}

@router.get("/aging/")
async def get_aging_deals(
    days: int = Query(14, ge=1),
    service: DealService = Depends(get_deal_service)
):
    deals = await service.get_aging_deals(days)
    return {"data": [d.model_dump(by_alias=True) for d in deals]}

@router.get("/by-owner/{user_id}")
async def get_deals_by_owner(
    user_id: str,
    service: DealService = Depends(get_deal_service)
):
    deals, _ = await service.list_deals(owner=user_id)
    return {"data": [d.model_dump(by_alias=True) for d in deals]}

@router.get("/{deal_id}")
async def get_deal(
    deal_id: str,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    deal = await service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(deal.prospectId)
    return {"data": _enrich(deal.model_dump(by_alias=True), prospect)}

@router.put("/{deal_id}")
@router.patch("/{deal_id}")
async def update_deal(
    deal_id: str,
    req: Request,
    deal_update: DealUpdate,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    update_data = deal_update.model_dump(exclude_unset=True)
    deal = await service.update_deal(deal_id, update_data)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(deal.prospectId)
    return {"data": _enrich(deal.model_dump(by_alias=True), prospect)}

@router.delete("/{deal_id}", status_code=204)
async def delete_deal(deal_id: str, service: DealService = Depends(get_deal_service)):
    deal = await service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    await service.update_deal(deal_id, {"deleted": True})

@router.post("/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    new_stage: str,
    req: Request,
    service: DealService = Depends(get_deal_service)
):
    user_id = req.headers.get("x-user-id", "user_default")
    deal = await service.move_to_stage(deal_id, new_stage, user_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}

@router.post("/{deal_id}/mark-won")
async def mark_deal_won(deal_id: str, service: DealService = Depends(get_deal_service)):
    deal = await service.mark_won(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}

@router.post("/{deal_id}/mark-lost")
async def mark_deal_lost(
    deal_id: str,
    reason: str = Query(...),
    service: DealService = Depends(get_deal_service)
):
    deal = await service.mark_lost(deal_id, reason)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}
