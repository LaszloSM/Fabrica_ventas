"""
Importa contactos desde Google Sheets a la base de datos del CRM.

Uso:
  cd backend
  pip install motor pymongo requests
  python scripts/import_from_sheet.py

  # Para BD real (Cosmos DB):
  COSMOS_CONNECTION_STRING="mongodb+srv://..." python scripts/import_from_sheet.py

  # Para BD en memoria (solo prueba visual - datos NO persisten):
  USE_MOCK_DB=True python scripts/import_from_sheet.py
"""

import asyncio
import csv
import io
import os
import re
import sys
import uuid
from datetime import datetime

import requests

SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "178okj8F_HoRh868plz1NJgePKOiRIZlPAFu_okw_fVA"
    "/export?format=csv&gid=2107831142"
)

# ── Mapeos ────────────────────────────────────────────────────────────────────

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
    "credimpacto grupos": "CREDIMPACTO_GRUPOS",
    "fundraising": "FUNDACION_CONVENIO",
    "fundrasing": "FUNDACION_CONVENIO",
    "fundación": "FUNDACION_CONVENIO",
    "fundacion": "FUNDACION_CONVENIO",
    "convenio": "FUNDACION_CONVENIO",
}

INDUSTRY_NORMALIZE = {
    "minero energetico": "Minero Energético",
    "minero energético": "Minero Energético",
    "sector público": "Sector Público",
    "sector publico": "Sector Público",
    "empresarial/sostenibilidad": "Empresarial / Sostenibilidad",
    "social/ impacto": "Social / Impacto",
    "social/impacto": "Social / Impacto",
    "financiero/microfinanzas": "Financiero / Microfinanzas",
    "educación": "Educación",
    "educacion": "Educación",
    "turismo": "Turismo",
    "servicios": "Servicios",
    "fundaciones": "Fundaciones",
    "inversion": "Inversión",
    "embajadas": "Embajadas",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def _clean(v: str) -> str:
    return v.strip().strip('"').strip()

def _stage(estado: str) -> str:
    return STAGE_MAP.get(estado.strip().lower(), "PROSPECTO_IDENTIFICADO")

def _service_types(raw: str) -> list[str]:
    """Parsea 'Consultoría y Proyectos, Academia' → ['CONSULTORIA_PROYECTO', 'ACADEMIA_CURSO']"""
    parts = [p.strip() for p in re.split(r"[,;]", raw) if p.strip()]
    result = []
    for p in parts:
        mapped = SERVICE_TYPE_MAP.get(p.lower())
        if mapped and mapped not in result:
            result.append(mapped)
    return result or ["CONSULTORIA_PROYECTO"]

def _industry(raw: str) -> str:
    return INDUSTRY_NORMALIZE.get(raw.strip().lower(), raw.strip() or "Sin clasificar")

def _is_linkedin(v: str) -> bool:
    return "linkedin.com" in v.lower()

def _is_url(v: str) -> bool:
    return v.strip().startswith("http")

def _clean_phone(v: str) -> str:
    digits = re.sub(r"[^\d+]", "", v)
    return digits[:20]

def _activity_done(col_value: str) -> bool:
    v = col_value.strip().lower()
    return v not in ("", "no", "0", "false")

# ── Lector de CSV ─────────────────────────────────────────────────────────────

def download_csv() -> list[dict]:
    print("📥 Descargando hoja de cálculo...")
    resp = requests.get(SHEET_URL, timeout=30)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    rows = []
    for row in reader:
        # Saltar filas completamente vacías
        values = [v.strip() for v in row.values()]
        if not any(values):
            continue
        # Saltar filas donde Nombre o Organización tienen URLs (LinkedIn scraping artifacts)
        nombre = _clean(row.get("Nombre Completo", ""))
        org = _clean(row.get("Organización", ""))
        if _is_url(nombre) or _is_url(org):
            continue
        if not nombre and not org:
            continue
        rows.append(row)
    print(f"   → {len(rows)} filas válidas encontradas")
    return rows

# ── Importación ───────────────────────────────────────────────────────────────

async def import_data(db):
    rows = download_csv()
    now = datetime.utcnow()

    prospects_col = db["prospects"]
    contacts_col = db["contacts"]
    deals_col = db["deals"]
    activities_col = db["activities"]

    # Índice: org_name → prospect_id (para deduplicar)
    org_index: dict[str, str] = {}

    stats = {"prospects": 0, "contacts": 0, "deals": 0, "activities": 0, "skipped": 0}

    for row in rows:
        nombre = _clean(row.get("Nombre Completo", ""))
        org = _clean(row.get("Organización", ""))
        cargo = _clean(row.get("Cargo", ""))
        sector = _clean(row.get("Sector", ""))
        pais = _clean(row.get("País", "Colombia"))
        ciudad = _clean(row.get("Ciudad Principal ", "") or row.get("Ciudad Principal", ""))
        areas = _clean(row.get("Áreas de impacto", ""))
        correo = _clean(row.get("Correo Electrónico", ""))
        celular = _clean(row.get("Celular", ""))
        linkedin_raw = _clean(row.get("LinkedIn", ""))
        responsable = _clean(row.get("Responsable", ""))
        oportunidades = _clean(row.get("Oportunidades", ""))
        estado = _clean(row.get("Estado", ""))
        comentarios = _clean(row.get("Comentarios ", "") or row.get("Comentarios", ""))

        # Actividades de outreach (columnas 14-25)
        act_linkedin_invite = _clean(row.get("Envio de invitacion  Linkdln", "") or row.get("Envio de invitacion Linkdln", ""))
        act_linkedin_accept = _clean(row.get("Aceptacion Linkdln", ""))
        act_linkedin_msg = _clean(row.get("Mensaje Linkdln", ""))
        act_email1 = _clean(row.get("Correo 1", ""))
        act_email2 = _clean(row.get("Correo 2", ""))
        act_email3 = _clean(row.get("Correo 3", ""))
        act_whatsapp = _clean(row.get("Whatsapp mensaje", ""))
        act_llamada = _clean(row.get("LLamada ", "") or row.get("LLamada", ""))
        act_reunion = _clean(row.get("Primera reunión", "") or row.get("Primera reunion", ""))
        act_mail_seg = _clean(row.get("Mail de seguimiento", ""))
        act_propuesta_prep = _clean(row.get("Preparación de propuesta ", "") or row.get("Preparacion de propuesta", ""))
        act_propuesta_reunion = _clean(row.get("Reunión de propuesta ", "") or row.get("Reunion de propuesta", ""))

        # Limpiar responsable que a veces tiene URLs de LinkedIn
        if _is_url(responsable):
            responsable = ""

        # ── Prospect (empresa) ────────────────────────────────────────────────
        org_key = org.lower() if org else nombre.lower()
        if org_key not in org_index:
            region = f"{ciudad}, {pais}" if ciudad and pais else (ciudad or pais or "Colombia")
            prospect_id = _id("prs")
            segment = "Grande"  # default
            if sector.lower() in ("sector público", "sector publico"):
                segment = "Público"
            elif sector.lower() in ("social/ impacto", "fundaciones"):
                segment = "Social"

            await prospects_col.insert_one({
                "_id": prospect_id,
                "name": org or nombre,
                "industry": _industry(sector),
                "size": "UNKNOWN",
                "segment": segment,
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

        # ── Contact (persona) ─────────────────────────────────────────────────
        if nombre:
            contact_id = _id("cnt")
            await contacts_col.insert_one({
                "_id": contact_id,
                "prospectId": prospect_id,
                "name": nombre,
                "role": cargo or None,
                "email": correo or None,
                "phone": _clean_phone(celular) if celular else None,
                "linkedinUrl": linkedin_raw if _is_linkedin(linkedin_raw) else None,
                "isPrimary": True,
                "createdAt": now,
                "updatedAt": now,
            })
            stats["contacts"] += 1
        else:
            contact_id = None

        # ── Deal (oportunidad) ────────────────────────────────────────────────
        service_types = _service_types(oportunidades or areas)
        stage = _stage(estado)

        for svc_type in service_types:
            deal_id = _id("deal")
            await deals_col.insert_one({
                "_id": deal_id,
                "prospectId": prospect_id,
                "contactId": contact_id,
                "assignedTo": responsable or None,
                "serviceType": svc_type,
                "line": _line_from_service(svc_type),
                "stage": stage,
                "value": None,
                "probability": _probability(stage),
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

            # ── Activities (outreach registrado en la hoja) ───────────────────
            activity_map = [
                (act_linkedin_invite, "LINKEDIN", "Invitación LinkedIn enviada"),
                (act_linkedin_accept, "LINKEDIN", "Conexión LinkedIn aceptada"),
                (act_linkedin_msg, "LINKEDIN", "Mensaje LinkedIn enviado"),
                (act_email1, "EMAIL", "Correo 1 enviado"),
                (act_email2, "EMAIL", "Correo 2 enviado"),
                (act_email3, "EMAIL", "Correo 3 enviado"),
                (act_whatsapp, "WHATSAPP", "Mensaje WhatsApp enviado"),
                (act_llamada, "CALL", "Llamada realizada"),
                (act_reunion, "MEETING", "Primera reunión"),
                (act_mail_seg, "EMAIL", "Mail de seguimiento"),
                (act_propuesta_prep, "NOTE", "Propuesta preparada"),
                (act_propuesta_reunion, "MEETING", "Reunión de propuesta"),
            ]
            for col_val, act_type, desc in activity_map:
                if _activity_done(col_val):
                    await activities_col.insert_one({
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
            break  # Un deal por contacto (el primero de service_types), evitar duplicados

    return stats


def _line_from_service(svc: str) -> str:
    if svc.startswith("CREDIMPACTO"):
        return "Crédimpacto"
    if svc in ("ACADEMIA_CURSO",):
        return "Academia"
    if svc == "CONSULTORIA_PROYECTO":
        return "Consultoría"
    return "Fundación"


def _probability(stage: str) -> float:
    probs = {
        "PROSPECTO_IDENTIFICADO": 5.0,
        "SENAL_DETECTADA": 10.0,
        "PRIMER_CONTACTO": 20.0,
        "EN_SECUENCIA": 35.0,
        "REUNION_AGENDADA": 50.0,
        "PROPUESTA_ENVIADA": 65.0,
        "NEGOCIACION": 80.0,
        "GANADO": 100.0,
        "PERDIDO": 0.0,
    }
    return probs.get(stage, 10.0)


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    use_mock = os.getenv("USE_MOCK_DB", "").lower() in ("true", "1", "yes")
    conn_str = os.getenv("COSMOS_CONNECTION_STRING", "mongodb://localhost:27017")
    db_name = os.getenv("COSMOS_DATABASE", "fabrica_ventas")

    if use_mock:
        print("⚠️  Modo en memoria (USE_MOCK_DB=True) — los datos NO persisten al reiniciar.")
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
        except ImportError:
            print("❌ mongomock-motor no instalado. Ejecuta: pip install mongomock-motor")
            sys.exit(1)
    else:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(conn_str)
            await client.admin.command("ping")
            print(f"✅ Conectado a MongoDB: {conn_str[:50]}...")
        except Exception as e:
            print(f"❌ No se pudo conectar a MongoDB: {e}")
            print("   Tip: usa USE_MOCK_DB=True para probar sin BD real")
            sys.exit(1)

    db = client[db_name]

    # Verificar si ya hay datos
    existing = await db["prospects"].count_documents({})
    if existing > 0:
        print(f"⚠️  Ya existen {existing} prospects en la BD.")
        answer = input("   ¿Continuar e importar de todas formas? (s/N): ").strip().lower()
        if answer not in ("s", "si", "sí", "y", "yes"):
            print("   Importación cancelada.")
            sys.exit(0)

    print("\n🚀 Iniciando importación...\n")
    stats = await import_data(db)

    print("\n✅ IMPORTACIÓN COMPLETADA")
    print(f"   Prospects (empresas): {stats['prospects']}")
    print(f"   Contacts (personas):  {stats['contacts']}")
    print(f"   Deals (oportunidades): {stats['deals']}")
    print(f"   Activities (outreach): {stats['activities']}")
    print(f"   Filas saltadas:        {stats['skipped']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
