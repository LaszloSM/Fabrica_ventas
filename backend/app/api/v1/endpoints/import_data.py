"""
Endpoint de importación desde Google Sheets.
Solo disponible si ENABLE_IMPORT=True en .env.local (seguridad).
"""
import csv
import io
import re
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/import", tags=["import"])

SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "178okj8F_HoRh868plz1NJgePKOiRIZlPAFu_okw_fVA"
    "/export?format=csv&gid=456943491"
)

STAGE_MAP = {
    "frio": "PRIMER_CONTACTO",
    "frío": "PRIMER_CONTACTO",
    "tibio": "EN_SECUENCIA",
    "caliente": "REUNION_AGENDADA",
}

SERVICE_TYPE_MAP = {
    "consultoría y proyectos": "CONSULTORIA_PROYECTO",
    "consultoria y proyectos": "CONSULTORIA_PROYECTO",
    "academia": "ACADEMIA_CURSO",
    "programa experiencias": "ACADEMIA_CURSO",
    "credimpacto": "CREDIMPACTO_CREDITOS",
    "crédimpacto": "CREDIMPACTO_CREDITOS",
    "fundraising": "FUNDACION_CONVENIO",
    "fundrasing": "FUNDACION_CONVENIO",
    "convenio": "FUNDACION_CONVENIO",
}

INDUSTRY_MAP = {
    "minero energetico": "Minero Energético",
    "minero energético": "Minero Energético",
    "sector público": "Sector Público",
    "sector publico": "Sector Público",
    "social/ impacto": "Social / Impacto",
    "empresarial/sostenibilidad": "Empresarial / Sostenibilidad",
    "financiero/microfinanzas": "Financiero / Microfinanzas",
    "educación": "Educación",
    "educacion": "Educación",
}


def _id(prefix): return f"{prefix}_{uuid.uuid4().hex[:12]}"
def _c(v): return (v or "").strip().strip('"').strip()
def _is_url(v): return v.strip().startswith("http")
def _is_linkedin(v): return "linkedin.com" in v.lower()
def _done(v): return v.strip().lower() not in ("", "no", "0", "false")

def _stage(estado):
    return STAGE_MAP.get(estado.strip().lower(), "PROSPECTO_IDENTIFICADO")

def _service_types(raw):
    parts = [p.strip() for p in re.split(r"[,;]", raw) if p.strip()]
    result = []
    for p in parts:
        m = SERVICE_TYPE_MAP.get(p.lower())
        if m and m not in result:
            result.append(m)
    return result or ["CONSULTORIA_PROYECTO"]

def _industry(raw):
    return INDUSTRY_MAP.get(raw.strip().lower(), raw.strip() or "Sin clasificar")

def _prob(stage):
    return {"PROSPECTO_IDENTIFICADO": 5.0, "PRIMER_CONTACTO": 20.0,
            "EN_SECUENCIA": 35.0, "REUNION_AGENDADA": 50.0}.get(stage, 10.0)

def _line(svc):
    if svc.startswith("CREDIMPACTO"): return "Crédimpacto"
    if svc == "ACADEMIA_CURSO": return "Academia"
    if svc == "CONSULTORIA_PROYECTO": return "Consultoría"
    return "Fundación"


@router.post("")
async def import_from_sheet(db=Depends(get_db)):  # noqa: C901
    """
    Importa contactos desde la Google Sheet de CoimpactoB.
    Llama a este endpoint UNA sola vez para poblar la BD.
    Seguro: solo corre si la colección prospects está vacía,
    o si pasas ?force=true.
    """
    existing = await db["prospects"].count_documents({})
    if existing > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existen {existing} prospects. Usa DELETE /import para limpiar primero."
        )

    # Descargar CSV
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(SHEET_URL)
        resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    rows = []
    for row in reader:
        values = [v.strip() for v in row.values()]
        if not any(values):
            continue
        nombre = _c(row.get("Nombre Completo", ""))
        org = _c(row.get("Organización", ""))
        if _is_url(nombre) or _is_url(org):
            continue
        if not nombre and not org:
            continue
        rows.append(row)

    now = datetime.utcnow()
    org_index: dict[str, str] = {}
    stats = {"prospects": 0, "contacts": 0, "deals": 0, "activities": 0}

    for row in rows:
        nombre = _c(row.get("Nombre Completo", ""))
        org = _c(row.get("Organización", ""))
        cargo = _c(row.get("Cargo", ""))
        sector = _c(row.get("Sector", ""))
        pais = _c(row.get("País", "")) or "Colombia"
        ciudad = _c(row.get("Ciudad Principal ", "") or row.get("Ciudad Principal", ""))
        areas = _c(row.get("Áreas de impacto", ""))
        correo = _c(row.get("Correo Electrónico", ""))
        celular = re.sub(r"[^\d+]", "", _c(row.get("Celular", "")))[:20]
        linkedin_raw = _c(row.get("LinkedIn", ""))
        responsable = _c(row.get("Responsable", ""))
        oportunidades = _c(row.get("Oportunidades", ""))
        estado = _c(row.get("Estado", ""))
        comentarios = _c(row.get("Comentarios ", "") or row.get("Comentarios", ""))

        if _is_url(responsable):
            responsable = ""

        # Prospect
        org_key = (org or nombre).lower()
        if org_key not in org_index:
            region = f"{ciudad}, {pais}" if ciudad else pais
            prospect_id = _id("prs")
            seg = "Público" if "público" in sector.lower() else (
                "Social" if "impacto" in sector.lower() or "fundaci" in sector.lower() else "Grande"
            )
            await db["prospects"].insert_one({
                "_id": prospect_id,
                "name": org or nombre,
                "industry": _industry(sector),
                "size": "UNKNOWN",
                "segment": seg,
                "region": region,
                "website": None,
                "linkedinUrl": linkedin_raw if _is_linkedin(linkedin_raw) else None,
                "assignedTo": responsable or None,
                "createdAt": now,
                "updatedAt": now,
            })
            org_index[org_key] = prospect_id
            stats["prospects"] += 1
        else:
            prospect_id = org_index[org_key]

        # Contact
        contact_id = None
        if nombre:
            contact_id = _id("cnt")
            await db["contacts"].insert_one({
                "_id": contact_id,
                "prospectId": prospect_id,
                "name": nombre,
                "role": cargo or None,
                "email": correo or None,
                "phone": celular or None,
                "linkedinUrl": linkedin_raw if _is_linkedin(linkedin_raw) else None,
                "isPrimary": True,
                "createdAt": now,
                "updatedAt": now,
            })
            stats["contacts"] += 1

        # Deal (uno por contacto, primer serviceType)
        service_types = _service_types(oportunidades or areas)
        stage = _stage(estado)
        svc = service_types[0]
        deal_id = _id("deal")
        await db["deals"].insert_one({
            "_id": deal_id,
            "prospectId": prospect_id,
            "contactId": contact_id,
            "assignedTo": responsable or None,
            "serviceType": svc,
            "line": _line(svc),
            "stage": stage,
            "value": None,
            "probability": _prob(stage),
            "ponderatedValue": None,
            "problem": None,
            "benefit": None,
            "nextAction": None,
            "nextActionDate": None,
            "quarter": None,
            "expectedCloseDate": None,
            "wonAt": None,
            "lostReason": None,
            "notes": comentarios or None,
            "createdAt": now,
            "updatedAt": now,
        })
        stats["deals"] += 1

        # Activities de outreach
        activity_cols = [
            ("Envio de invitacion  Linkdln", "LINKEDIN", "Invitación LinkedIn enviada"),
            ("Aceptacion Linkdln", "LINKEDIN", "Conexión LinkedIn aceptada"),
            ("Mensaje Linkdln", "LINKEDIN", "Mensaje LinkedIn enviado"),
            ("Correo 1", "EMAIL", "Correo 1 enviado"),
            ("Correo 2", "EMAIL", "Correo 2 enviado"),
            ("Correo 3", "EMAIL", "Correo 3 enviado"),
            ("Whatsapp mensaje", "WHATSAPP", "Mensaje WhatsApp"),
            ("LLamada ", "CALL", "Llamada realizada"),
            ("Primera reunión", "MEETING", "Primera reunión"),
            ("Mail de seguimiento", "EMAIL", "Mail de seguimiento"),
            ("Preparación de propuesta ", "NOTE", "Propuesta preparada"),
            ("Reunión de propuesta ", "MEETING", "Reunión de propuesta"),
        ]
        for col_name, act_type, desc in activity_cols:
            val = _c(row.get(col_name, ""))
            if _done(val):
                await db["activities"].insert_one({
                    "_id": _id("act"),
                    "dealId": deal_id,
                    "prospectId": prospect_id,
                    "type": act_type,
                    "outcome": "COMPLETED",
                    "notes": desc,
                    "doneAt": now,
                    "createdById": responsable or "import",
                    "createdAt": now,
                })
                stats["activities"] += 1

    return {
        "data": {
            "message": "Importacion completada exitosamente",
            **stats,
            "totalRows": len(rows),
        }
    }


@router.delete("")
async def clear_imported_data(db=Depends(get_db)):
    """Elimina todos los datos importados (prospects, contacts, deals, activities)."""
    r_p = await db["prospects"].delete_many({})
    r_c = await db["contacts"].delete_many({})
    r_d = await db["deals"].delete_many({})
    r_a = await db["activities"].delete_many({})
    return {"data": {
        "prospects_deleted": r_p.deleted_count,
        "contacts_deleted": r_c.deleted_count,
        "deals_deleted": r_d.deleted_count,
        "activities_deleted": r_a.deleted_count,
    }}
