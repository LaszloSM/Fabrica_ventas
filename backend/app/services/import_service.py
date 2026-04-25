"""
Servicio de importación masiva desde múltiples CSVs subidos por upload HTTP.
"""
import csv
import io
import re
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

STAGE_MAP = {
    "frio": "PRIMER_CONTACTO",
    "frío": "PRIMER_CONTACTO",
    "tibio": "EN_SECUENCIA",
    "caliente": "REUNION_AGENDADA",
    "": "PROSPECTO_IDENTIFICADO",
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
    "convenios": "FUNDACION_CONVENIO",
    "banco": "CONSULTORIA_PROYECTO",
    "sostenibilidad / esg": "CONSULTORIA_PROYECTO",
    "aceleradora": "ACADEMIA_CURSO",
}

LINE_MAP = {
    "CREDIMPACTO_CREDITOS": "Crédimpacto",
    "ACADEMIA_CURSO": "Academia",
    "CONSULTORIA_PROYECTO": "Consultoría",
    "FUNDACION_CONVENIO": "Fundación",
}

def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def _c(v) -> str:
    """Clean string value"""
    return (v or "").strip().strip('"').strip()

def _is_url(v: str) -> bool:
    return v.strip().startswith("http")

def _is_linkedin(v: str) -> bool:
    return "linkedin.com" in v.lower() or "linked.in" in v.lower()

def _done(v: str) -> bool:
    """Check if activity was completed"""
    val = v.strip().lower()
    return val not in ("", "no", "0", "false", "sin email", "no aplica", "no enviado", "no aceptado", "sin respuesta", "reunión no agendada", "reunion no agendada", "no respondido", "sin iniciar", "-")

def _stage(estado: str) -> str:
    return STAGE_MAP.get(estado.strip().lower(), "PROSPECTO_IDENTIFICADO")

def _service_types(raw: str) -> List[str]:
    if not raw:
        return ["CONSULTORIA_PROYECTO"]
    parts = [p.strip() for p in re.split(r"[,;/]", raw) if p.strip()]
    result = []
    for p in parts:
        m = SERVICE_TYPE_MAP.get(p.lower())
        if m and m not in result:
            result.append(m)
    return result or ["CONSULTORIA_PROYECTO"]

def _line(svc: str) -> str:
    return LINE_MAP.get(svc, "Consultoría")

def _prob(stage: str) -> float:
    return {
        "PROSPECTO_IDENTIFICADO": 5.0,
        "PRIMER_CONTACTO": 20.0,
        "EN_SECUENCIA": 35.0,
        "REUNION_AGENDADA": 50.0,
        "PROPUESTA_ENVIADA": 65.0,
        "NEGOCIACION": 80.0,
        "GANADO": 100.0,
        "PERDIDO": 0.0,
    }.get(stage, 10.0)


class ImportService:
    def __init__(self, db):
        self.db = db
        self.now = datetime.utcnow()
        self.org_index: Dict[str, str] = {}  # org_name_lower -> prospect_id
        self.email_index: Dict[str, str] = {}  # email -> contact_id
        self.team_members: Dict[str, str] = {}  # name -> team_member_id
        self.stats = {
            "prospects": 0,
            "contacts": 0,
            "deals": 0,
            "activities": 0,
            "team_members": 0,
            "duplicates_skipped": 0,
            "rows_processed": 0,
        }
    
    async def _extract_and_create_team_members(self, all_rows: List[Dict]) -> None:
        """Extrae vendedores únicos de todas las filas y los crea como team_members"""
        unique_names: Set[str] = set()
        
        for row in all_rows:
            responsable = ""
            if "Responsable" in row:
                responsable = _c(row.get("Responsable", ""))
            elif "responsable" in row:
                responsable = _c(row.get("responsable", ""))
            
            if responsable and len(responsable) > 1 and not _is_url(responsable):
                unique_names.add(responsable)
        
        # Crear team_members
        for name in sorted(unique_names):
            existing = await self.db["team_members"].find_one({"name": name})
            if existing:
                self.team_members[name] = str(existing["_id"])
            else:
                doc = {
                    "_id": _id("tm"),
                    "name": name,
                    "email": None,
                    "role": "SALES_REP",
                    "isActive": True,
                    "createdAt": self.now,
                    "updatedAt": self.now,
                }
                await self.db["team_members"].insert_one(doc)
                self.team_members[name] = doc["_id"]
                self.stats["team_members"] += 1
    
    def _get_responsable_id(self, row: Dict) -> Optional[str]:
        """Obtiene el ID del responsable de una fila"""
        responsable = ""
        if "Responsable" in row:
            responsable = _c(row.get("Responsable", ""))
        elif "responsable" in row:
            responsable = _c(row.get("responsable", ""))
        
        if responsable and responsable in self.team_members:
            return self.team_members[responsable]
        return None
    
    def _read_csv_content(self, content: str) -> List[Dict]:
        """Lee contenido CSV desde string y devuelve lista de diccionarios"""
        rows = []
        reader = csv.DictReader(io.StringIO(content))
        for row in reader:
            # Limpiar claves
            clean_row = {k.strip(): v for k, v in row.items()}
            rows.append(clean_row)
        return rows
    
    async def _create_prospect(self, org: str, sector: str, pais: str, ciudad: str, 
                               linkedin: str, is_archived: bool = False) -> str:
        """Crea un prospect (o reutiliza si ya existe)"""
        org_key = org.lower() if org else "sin-organizacion"
        
        if org_key in self.org_index:
            return self.org_index[org_key]
        
        prospect_id = _id("prs")
        region = f"{ciudad}, {pais}" if ciudad else (pais or "Colombia")
        
        seg = "Público" if "público" in sector.lower() or "publico" in sector.lower() else (
            "Social" if any(x in sector.lower() for x in ["impacto", "fundaci", "social"]) else (
                "Financiero" if any(x in sector.lower() for x in ["banco", "financiero", "microfinanzas"]) else "Grande"
            )
        )
        
        await self.db["prospects"].insert_one({
            "_id": prospect_id,
            "name": org or "Sin organización",
            "industry": sector or "Sin clasificar",
            "size": "UNKNOWN",
            "segment": seg,
            "region": region,
            "website": None,
            "linkedinUrl": linkedin if _is_linkedin(linkedin) else None,
            "assignedTo": None,
            "createdAt": self.now,
            "updatedAt": self.now,
            "archived": is_archived,
        })
        
        self.org_index[org_key] = prospect_id
        self.stats["prospects"] += 1
        return prospect_id
    
    async def _create_contact(self, prospect_id: str, nombre: str, cargo: str, 
                              correo: str, celular: str, linkedin: str) -> Optional[str]:
        """Crea un contacto (o devuelve existente si deduplica por email)"""
        # Deduplicación por email
        email_key = correo.lower() if correo else None
        if email_key and email_key in self.email_index:
            self.stats["duplicates_skipped"] += 1
            return self.email_index[email_key]
        
        contact_id = _id("cnt")
        await self.db["contacts"].insert_one({
            "_id": contact_id,
            "prospectId": prospect_id,
            "name": nombre or "Sin nombre",
            "role": cargo or None,
            "email": correo or None,
            "phone": re.sub(r"[^\d+]", "", celular)[:20] if celular else None,
            "linkedinUrl": linkedin if _is_linkedin(linkedin) else None,
            "isPrimary": True,
            "createdAt": self.now,
            "updatedAt": self.now,
        })
        
        if email_key:
            self.email_index[email_key] = contact_id
        
        self.stats["contacts"] += 1
        return contact_id
    
    async def _create_deal(self, prospect_id: str, contact_id: Optional[str], 
                          assigned_to: Optional[str], service_types: List[str], 
                          stage: str, notes: str, is_archived: bool = False) -> str:
        """Crea un deal"""
        svc = service_types[0] if service_types else "CONSULTORIA_PROYECTO"
        deal_id = _id("deal")
        
        await self.db["deals"].insert_one({
            "_id": deal_id,
            "prospectId": prospect_id,
            "contactId": contact_id,
            "assignedTo": assigned_to,
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
            "notes": notes or None,
            "createdAt": self.now,
            "updatedAt": self.now,
            "archived": is_archived,
            "source": "csv_import",
        })
        
        self.stats["deals"] += 1
        return deal_id
    
    async def _create_activities_from_row(self, row: Dict, deal_id: str, 
                                         prospect_id: str, responsable_id: Optional[str]) -> None:
        """Crea actividades basadas en las columnas de outreach de la fila"""
        activity_cols = [
            ("Envio de invitacion  Linkdln", "LINKEDIN_CONNECT", "Invitación LinkedIn enviada"),
            ("Aceptacion Linkdln", "LINKEDIN_ACCEPT", "Conexión LinkedIn aceptada"),
            ("Mensaje Linkdln", "LINKEDIN_MESSAGE", "Mensaje LinkedIn enviado"),
            ("Correo 1", "EMAIL", "Correo 1 enviado"),
            ("Correo 2", "EMAIL", "Correo 2 enviado"),
            ("Correo 3", "EMAIL", "Correo 3 enviado"),
            ("Whatsapp mensaje", "WHATSAPP", "Mensaje WhatsApp"),
            ("LLamada ", "CALL", "Llamada realizada"),
            ("Primera reunión", "MEETING", "Primera reunión"),
            ("Mail de seguimiento", "EMAIL_FOLLOWUP", "Mail de seguimiento"),
            ("Preparación de propuesta ", "PROPOSAL_PREP", "Propuesta preparada"),
            ("Reunión de propuesta ", "MEETING", "Reunión de propuesta"),
            ("INVITACIÓN LKD ANDREA", "LINKEDIN_CONNECT", "Invitación LinkedIn enviada (Andrea)"),
            ("INVITACIÓN LKD  DANIEL", "LINKEDIN_CONNECT", "Invitación LinkedIn enviada (Daniel)"),
            ("RESPUESTA LINKED", "LINKEDIN_ACCEPT", "Respuesta LinkedIn"),
            ("CORREO", "EMAIL", "Correo enviado"),
            ("RESPUESTA CORREO", "EMAIL_REPLY", "Respuesta a correo"),
            ("REUNION", "MEETING", "Reunión"),
        ]
        
        for col_name, act_type, desc in activity_cols:
            if col_name in row:
                val = _c(row.get(col_name, ""))
                if _done(val):
                    await self.db["activities"].insert_one({
                        "_id": _id("act"),
                        "dealId": deal_id,
                        "prospectId": prospect_id,
                        "type": act_type,
                        "outcome": "COMPLETED",
                        "notes": desc,
                        "doneAt": self.now,
                        "createdById": responsable_id or "import",
                        "createdAt": self.now,
                    })
                    self.stats["activities"] += 1
    
    async def import_from_files(self, file_contents: Dict[str, str], force: bool = False) -> Dict:
        """
        Importa datos desde contenidos CSV subidos por HTTP.
        file_contents: {filename: content_string}
        """
        # Verificar si ya hay datos
        if not force:
            existing = await self.db["prospects"].count_documents({})
            if existing > 0:
                return {
                    "error": True,
                    "message": f"Ya existen {existing} prospects. Usa force=true para reimportar.",
                }
        
        # Limpiar datos anteriores si se fuerza
        if force:
            await self.db["prospects"].delete_many({})
            await self.db["contacts"].delete_many({})
            await self.db["deals"].delete_many({})
            await self.db["activities"].delete_many({})
            await self.db["team_members"].delete_many({})
        
        # Leer todos los CSVs
        all_rows = []
        source_map = {}
        
        for filename, content in file_contents.items():
            rows = self._read_csv_content(content)
            start_idx = len(all_rows)
            all_rows.extend(rows)
            for i in range(start_idx, len(all_rows)):
                source_map[i] = filename
            print(f"[Import] Procesado {filename}: {len(rows)} filas")
        
        self.stats["rows_processed"] = len(all_rows)
        
        if len(all_rows) == 0:
            return {
                "error": True,
                "message": "No se encontraron filas en los archivos CSV. Verifica que los archivos no estén vacíos.",
            }
        
        # Paso 1: Extraer y crear team_members
        await self._extract_and_create_team_members(all_rows)
        print(f"[Import] Team members creados: {self.stats['team_members']}")
        
        # Paso 2: Procesar cada fila
        for idx, row in enumerate(all_rows):
            source = source_map.get(idx, "unknown")
            is_archived = "2025" in source
            
            # Normalizar campos según la fuente
            nombre, org, cargo, sector, pais, ciudad, correo, celular, linkedin = "", "", "", "", "", "", "", "", ""
            responsable_id = None
            estado = ""
            oportunidades = ""
            notas = ""
            
            if "2026" in source:
                nombre = _c(row.get("Nombre Completo", ""))
                org = _c(row.get("Organización", ""))
                cargo = _c(row.get("Cargo", ""))
                sector = _c(row.get("Sector", ""))
                pais = _c(row.get("País", "")) or "Colombia"
                ciudad = _c(row.get("Ciudad Principal", ""))
                correo = _c(row.get("Correo Electrónico", ""))
                celular = _c(row.get("Celular", ""))
                linkedin = _c(row.get("LinkedIn", ""))
                responsable_id = self._get_responsable_id(row)
                oportunidades = _c(row.get("Oportunidades", ""))
                estado = _c(row.get("Estado", ""))
                notas = _c(row.get("Comentarios", ""))
                
            elif "Banca frio" in source:
                nombre = _c(row.get("NOMBRE", ""))
                org = _c(row.get("INSTITUCION", ""))
                cargo = _c(row.get("CARGO", ""))
                sector = "Financiero / Microfinanzas"
                pais = _c(row.get("Pais", "")) or "Colombia"
                ciudad = ""
                correo = _c(row.get("Mail", ""))
                linkedin = _c(row.get("Linkedin", ""))
                oportunidades = _c(row.get("Segmento", ""))
                estado = "frio"
                
            elif "Banca caliente" in source:
                nombre = _c(row.get("NOMBRE", ""))
                org = _c(row.get("ORGANIZACION", ""))
                cargo = _c(row.get("CARGO", ""))
                sector = "Financiero / Microfinanzas"
                pais = "Colombia"
                correo = _c(row.get("MAIL", ""))
                linkedin = _c(row.get("LINKEIN", ""))
                celular = _c(row.get("TELEFONO", ""))
                estado = "caliente"
                notas = _c(row.get("ACCIONES", ""))
                
            elif "CAF" in source:
                nombre = _c(row.get("NOMBRE", ""))
                org = _c(row.get("INSTITUCION", ""))
                cargo = _c(row.get("CARGO", ""))
                sector = "Desarrollo Financiero"
                pais = _c(row.get("Pais", "")) or ""
                ciudad = _c(row.get("Ciudad", ""))
                correo = _c(row.get("Mail", ""))
                linkedin = _c(row.get("Linkedin", ""))
                estado = "frio"
                
            elif "Contactos airtable" in source:
                values = list(row.values())
                if len(values) >= 6:
                    nombre = _c(values[0])
                    correo = _c(values[1])
                    celular = _c(values[2])
                    org = _c(values[3])
                    cargo = _c(values[4])
                    estado = _c(values[5])
                    linkedin = _c(values[6]) if len(values) > 6 else ""
                    pais = _c(values[10]) if len(values) > 10 else "Colombia"
                    ciudad = _c(values[11]) if len(values) > 11 else ""
                    sector = _c(values[12]) if len(values) > 12 else ""
                    notas = _c(values[13]) if len(values) > 13 else ""
                    
            elif "Base de datos 2025" in source:
                nombre = _c(row.get("Nombre Completo", ""))
                correo = _c(row.get("Correo Electrónico", ""))
                celular = _c(row.get("Teléfono", ""))
                org = _c(row.get("Organización", ""))
                cargo = _c(row.get("Cargo", ""))
                linkedin = _c(row.get("LinkedIN", ""))
                estado_rel = _c(row.get("Relación con el contacto", ""))
                oportunidades = _c(row.get("Oportunidades", ""))
                responsable_id = self._get_responsable_id(row)
                pais = _c(row.get("Pais", "")) or "Colombia"
                ciudad = _c(row.get("Ciudad", ""))
                sector = _c(row.get("Organización - Industria", ""))
                notas = _c(row.get("Resumen Inteligente de Notas", ""))
                estado = "frio" if estado_rel.lower() in ["frio", ""] else ("caliente" if estado_rel.lower() == "caliente" else "tibio")
            
            # Validar fila mínima
            if not nombre and not org:
                continue
            if _is_url(nombre):
                continue
            
            # Crear prospect
            prospect_id = await self._create_prospect(
                org=org or nombre,
                sector=sector,
                pais=pais,
                ciudad=ciudad,
                linkedin=linkedin,
                is_archived=is_archived,
            )
            
            # Crear contact
            contact_id = await self._create_contact(
                prospect_id=prospect_id,
                nombre=nombre,
                cargo=cargo,
                correo=correo,
                celular=celular,
                linkedin=linkedin,
            )
            
            # Crear deal
            service_types = _service_types(oportunidades)
            stage = _stage(estado)
            deal_id = await self._create_deal(
                prospect_id=prospect_id,
                contact_id=contact_id,
                assigned_to=responsable_id,
                service_types=service_types,
                stage=stage,
                notes=notas,
                is_archived=is_archived,
            )
            
            # Crear actividades
            await self._create_activities_from_row(row, deal_id, prospect_id, responsable_id)
        
        return {
            "error": False,
            "message": "Importación completada exitosamente",
            "data": self.stats,
        }
