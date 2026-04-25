"""
Endpoint de importación masiva desde upload de CSVs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Dict
from app.database import get_db
from app.services.import_service import ImportService

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/comprehensive")
async def import_comprehensive(
    files: List[UploadFile] = File(..., description="Archivos CSV a importar"),
    force: bool = Query(False, description="Forzar reimportación eliminando datos existentes"),
    db=Depends(get_db),
):
    """
    Importa datos desde archivos CSV subidos por el usuario.
    Soporta múltiples archivos CSV que se combinan en una sola importación.
    """
    # Leer contenido de todos los archivos
    file_contents: Dict[str, str] = {}
    for file in files:
        if not file.filename.endswith('.csv'):
            continue
        content = await file.read()
        try:
            file_contents[file.filename] = content.decode('utf-8')
        except UnicodeDecodeError:
            file_contents[file.filename] = content.decode('latin-1')
    
    if not file_contents:
        raise HTTPException(status_code=400, detail="No se proporcionaron archivos CSV válidos")
    
    service = ImportService(db)
    result = await service.import_from_files(file_contents, force=force)
    
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
