from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional

from app.database import get_db
from app.schemas.prospect import ProspectCreate, ProspectUpdate
from app.services.prospect_service import ProspectService

router = APIRouter(prefix="/prospects", tags=["prospects"])

async def get_prospect_service(db=Depends(get_db)):
    return ProspectService(db)

@router.post("", status_code=201)
async def create_prospect(
    prospect_data: ProspectCreate,
    service: ProspectService = Depends(get_prospect_service)
):
    prospect = await service.create_prospect(prospect_data.model_dump())
    return {"data": prospect.model_dump(by_alias=True)}

@router.get("")
async def list_prospects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: str = Query(""),
    region: Optional[str] = Query(None),
    service: ProspectService = Depends(get_prospect_service)
):
    prospects, total = await service.list_prospects(skip, limit, search, region)
    return {"data": [p.model_dump(by_alias=True) for p in prospects], "total": total}

@router.get("/{prospect_id}")
async def get_prospect(
    prospect_id: str,
    service: ProspectService = Depends(get_prospect_service)
):
    prospect = await service.get_prospect(prospect_id)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect no encontrado")
    return {"data": prospect.model_dump(by_alias=True)}

@router.put("/{prospect_id}")
@router.patch("/{prospect_id}")
async def update_prospect(
    prospect_id: str,
    prospect_update: ProspectUpdate,
    service: ProspectService = Depends(get_prospect_service)
):
    update_data = prospect_update.model_dump(exclude_unset=True)
    prospect = await service.update_prospect(prospect_id, update_data)
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect no encontrado")
    return {"data": prospect.model_dump(by_alias=True)}

@router.delete("/{prospect_id}", status_code=204)
async def delete_prospect(
    prospect_id: str,
    service: ProspectService = Depends(get_prospect_service)
):
    deleted = await service.delete_prospect(prospect_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prospect no encontrado")
