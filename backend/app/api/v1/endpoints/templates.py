from fastapi import APIRouter, Depends, Query
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/templates", tags=["templates"])

SEED_TEMPLATES = [
    {"name":"Email Frío - Presentación CoimpactoB","type":"EMAIL_COLD","segment":"Grande","serviceType":"CONSULTORIA_PROYECTO","subject":"{{nombre}}, ¿listos para el siguiente paso?","body":"Hola {{nombre}},\n\nSoy {{vendedor}} de CoimpactoB. Trabajamos con empresas como {{empresa}} para {{beneficio_clave}}.\n\nVi que están expandiendo operaciones en {{region}} y quería explorar si hay sinergias.\n\n¿Tienes 20 minutos esta semana?\n\nSaludos,\n{{vendedor}}"},
    {"name":"Email Frío - Señal de Expansión","type":"EMAIL_COLD","segment":"Mediana","serviceType":"CREDIMPACTO_GRUPOS","subject":"Felicitaciones por {{señal_detectada}}","body":"Hola {{nombre}},\n\nVi la noticia sobre {{señal_detectada}} — felicitaciones, es un gran hito.\n\nEn CoimpactoB ayudamos a empresas en crecimiento a estructurar {{servicio}} para sus equipos.\n\n¿Vale la pena conversar?\n\n{{vendedor}}"},
    {"name":"Email Frío - Convocatoria/Fondos","type":"EMAIL_COLD","segment":"PYME","serviceType":"FUNDACION_CONVENIO","subject":"Oportunidad de financiamiento para {{empresa}}","body":"Hola {{nombre}},\n\nActualmente hay convocatorias abiertas que podrían aplicar para {{empresa}}.\n\nDesde la Fundación CoimpactoB acompañamos organizaciones en la formulación y presentación de proyectos.\n\n¿Conversamos esta semana?\n\n{{vendedor}}"},
    {"name":"Seguimiento D+3 - Sin respuesta","type":"EMAIL_FOLLOWUP","segment":None,"serviceType":None,"subject":"Re: {{asunto_anterior}}","body":"Hola {{nombre}},\n\nQuería hacer seguimiento a mi email anterior. Entiendo que tienes muchos frentes, así que seré directo:\n\n¿Tiene sentido hablar sobre {{beneficio_clave}} para {{empresa}}?\n\nSi no es el momento correcto, sin problema — solo dímelo.\n\n{{vendedor}}"},
    {"name":"Seguimiento D+7 - Recurso de valor","type":"EMAIL_FOLLOWUP","segment":None,"serviceType":None,"subject":"Algo útil para {{empresa}}","body":"Hola {{nombre}},\n\nTe comparto esto porque creo que puede ser relevante para {{empresa}}: [recurso/caso de éxito].\n\nEmpresas similares lograron {{resultado_específico}} en {{tiempo}}.\n\n¿Agendamos una llamada rápida?\n\n{{vendedor}}"},
    {"name":"Seguimiento Final - Break-up","type":"EMAIL_FOLLOWUP","segment":None,"serviceType":None,"subject":"¿Cerramos el tema?","body":"Hola {{nombre}},\n\nHe intentado contactarte varias veces sin éxito. No quiero ser intrusivo.\n\nSi no es el momento correcto o no hay interés, sin problema — solo dímelo y no te molesto más.\n\nSi quieres retomar, aquí estaré.\n\n{{vendedor}}"},
    {"name":"LinkedIn - Conexión inicial","type":"LINKEDIN_MESSAGE","segment":None,"serviceType":None,"subject":None,"body":"Hola {{nombre}}, vi tu perfil y me pareció muy interesante lo que están haciendo en {{empresa}} en {{area}}. Trabajo en CoimpactoB ayudando a organizaciones como la tuya en {{beneficio_breve}}. ¿Conectamos?"},
    {"name":"LinkedIn - Mensaje post-conexión","type":"LINKEDIN_MESSAGE","segment":None,"serviceType":None,"subject":None,"body":"Hola {{nombre}}, gracias por conectar. Vi que {{señal_linkedin}} — ¿esto implica que están buscando fortalecer {{area}}? En CoimpactoB tenemos experiencia en eso. ¿Vale la pena una conversación de 15 min?"},
    {"name":"LinkedIn - Compartir contenido","type":"LINKEDIN_TRIGGER","segment":None,"serviceType":None,"subject":None,"body":"{{nombre}}, vi tu publicación sobre {{tema}} — completamente de acuerdo con tu punto sobre {{aspecto}}. En CoimpactoB publicamos algo relacionado que puede sumar: [link]. ¿Qué piensas?"},
    {"name":"Guión de Llamada - Primer Contacto","type":"CALL_SCRIPT","segment":None,"serviceType":None,"subject":None,"body":"APERTURA:\n'Hola {{nombre}}, soy {{vendedor}} de CoimpactoB. ¿Tienes 2 minutos?'\n\nPROPÓSITO:\n'Te llamo porque trabajamos con empresas en {{sector}} y vi que {{señal_detectada}}. Quería explorar si hay algo en lo que podamos aportar.'\n\nPREGUNTA ABIERTA:\n'¿Cuál es el mayor desafío que están enfrentando ahora mismo en {{area}}?'\n\nSI HAY INTERÉS:\n'¿Cuándo podríamos tener una reunión de 30 min para ver esto en detalle?'\n\nSI NO HAY TIEMPO:\n'Sin problema. ¿Te puedo enviar un email con más info y coordinamos para la próxima semana?'"},
    {"name":"Guión Voicemail","type":"VOICEMAIL","segment":None,"serviceType":None,"subject":None,"body":"'Hola {{nombre}}, soy {{vendedor}} de CoimpactoB. Te llamo porque creo que podemos ayudar a {{empresa}} con {{beneficio_breve}}. Te envío un email con más detalle. Si quieres hablar, mi número es {{telefono}}. ¡Que tengas buen día!'"},
]

async def _get_or_seed(db):
    col = db["templates"]
    count = await col.count_documents({})
    if count == 0:
        docs = []
        for t in SEED_TEMPLATES:
            doc = {
                "_id": f"tmpl_{uuid.uuid4().hex[:12]}",
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
                **t
            }
            docs.append(doc)
        await col.insert_many(docs)
    cursor = col.find({})
    return await cursor.to_list(length=None)

def _fmt(doc):
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = doc["_id"]
    if isinstance(d.get("createdAt"), datetime):
        d["createdAt"] = d["createdAt"].isoformat()
    if isinstance(d.get("updatedAt"), datetime):
        d["updatedAt"] = d["updatedAt"].isoformat()
    return d

@router.get("")
async def list_templates(
    type: str = Query(None),
    db=Depends(get_db)
):
    docs = await _get_or_seed(db)
    if type:
        docs = [d for d in docs if d.get("type") == type]
    return {"data": [_fmt(d) for d in docs]}

@router.post("", status_code=201)
async def create_template(payload: dict, db=Depends(get_db)):
    col = db["templates"]
    payload["_id"] = f"tmpl_{uuid.uuid4().hex[:12]}"
    payload["createdAt"] = datetime.utcnow()
    payload["updatedAt"] = datetime.utcnow()
    await col.insert_one(payload)
    return {"data": _fmt(payload)}

@router.get("/{template_id}")
async def get_template(template_id: str, db=Depends(get_db)):
    doc = await db["templates"].find_one({"_id": template_id})
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(404, "Template no encontrado")
    return {"data": _fmt(doc)}
