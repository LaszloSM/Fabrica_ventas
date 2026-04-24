from fastapi import APIRouter, Depends
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/template-sequences", tags=["template-sequences"])

SEED = [
    {
        "name": "Secuencia Email + LinkedIn (5 pasos)",
        "description": "Contacto multicanal: email frío, LinkedIn, seguimiento y cierre",
        "steps": [
            {"stepNumber": 1, "type": "EMAIL", "dayOffset": 0, "description": "Email frío de presentación"},
            {"stepNumber": 2, "type": "LINKEDIN", "dayOffset": 3, "description": "Conexión LinkedIn"},
            {"stepNumber": 3, "type": "EMAIL", "dayOffset": 7, "description": "Seguimiento D+7"},
            {"stepNumber": 4, "type": "CALL", "dayOffset": 10, "description": "Llamada de seguimiento"},
            {"stepNumber": 5, "type": "EMAIL", "dayOffset": 14, "description": "Email break-up"},
        ]
    },
    {
        "name": "Secuencia Llamada Directa (3 pasos)",
        "description": "Para prospectos warm: llamada + email + cierre",
        "steps": [
            {"stepNumber": 1, "type": "CALL", "dayOffset": 0, "description": "Llamada inicial"},
            {"stepNumber": 2, "type": "EMAIL", "dayOffset": 2, "description": "Email de seguimiento"},
            {"stepNumber": 3, "type": "CALL", "dayOffset": 7, "description": "Llamada de cierre"},
        ]
    },
    {
        "name": "Secuencia LinkedIn Pura (4 pasos)",
        "description": "Para prospectos activos en LinkedIn",
        "steps": [
            {"stepNumber": 1, "type": "LINKEDIN", "dayOffset": 0, "description": "Solicitud de conexión"},
            {"stepNumber": 2, "type": "LINKEDIN", "dayOffset": 3, "description": "Mensaje post-conexión"},
            {"stepNumber": 3, "type": "LINKEDIN", "dayOffset": 7, "description": "Compartir contenido relevante"},
            {"stepNumber": 4, "type": "EMAIL", "dayOffset": 12, "description": "Email directo"},
        ]
    },
]

async def _seed(db):
    col = db["template_sequences"]
    if await col.count_documents({}) > 0:
        return
    now = datetime.utcnow()
    for seq in SEED:
        seq_id = f"tmplseq_{uuid.uuid4().hex[:12]}"
        await col.insert_one({
            "_id": seq_id,
            "name": seq["name"],
            "description": seq["description"],
            "createdAt": now,
            "updatedAt": now,
        })
        for step in seq["steps"]:
            await db["template_sequence_steps"].insert_one({
                "_id": f"tmplstep_{uuid.uuid4().hex[:12]}",
                "templateSequenceId": seq_id,
                "templateId": None,
                "createdAt": now,
                **step,
            })

def _fmt_dt(v):
    return v.isoformat() if isinstance(v, datetime) else v

@router.get("")
async def list_template_sequences(db=Depends(get_db)):
    await _seed(db)
    seqs = await db["template_sequences"].find({}).to_list(length=None)
    result = []
    for seq in seqs:
        raw_steps = await db["template_sequence_steps"].find(
            {"templateSequenceId": seq["_id"]}
        ).sort("stepNumber", 1).to_list(length=None)
        steps_out = []
        for s in raw_steps:
            so = {k: v for k, v in s.items() if k != "_id"}
            so["id"] = s["_id"]
            so["createdAt"] = _fmt_dt(so.get("createdAt"))
            steps_out.append(so)
        result.append({
            "id": seq["_id"],
            "name": seq["name"],
            "description": seq.get("description"),
            "createdAt": _fmt_dt(seq.get("createdAt")),
            "steps": steps_out,
        })
    return {"data": result}
