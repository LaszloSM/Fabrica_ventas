from fastapi import APIRouter, Depends, Query
from app.database import get_db
from app.services.deal_service import DealService

router = APIRouter(prefix="/metrics", tags=["metrics"])

STAGE_ORDER = [
    "PROSPECTO_IDENTIFICADO", "SENAL_DETECTADA", "PRIMER_CONTACTO",
    "EN_SECUENCIA", "REUNION_AGENDADA", "PROPUESTA_ENVIADA",
    "NEGOCIACION", "GANADO", "PERDIDO"
]

STAGE_LABELS = {
    "PROSPECTO_IDENTIFICADO": "Identificado",
    "SENAL_DETECTADA": "Señal",
    "PRIMER_CONTACTO": "Primer Contacto",
    "EN_SECUENCIA": "En Secuencia",
    "REUNION_AGENDADA": "Reunión Agendada",
    "PROPUESTA_ENVIADA": "Propuesta Enviada",
    "NEGOCIACION": "Negociación",
    "GANADO": "Ganado",
    "PERDIDO": "Perdido",
}

SERVICE_TYPES = [
    "CREDIMPACTO_GRUPOS", "CREDIMPACTO_CREDITOS",
    "ACADEMIA_CURSO", "CONSULTORIA_PROYECTO", "FUNDACION_CONVENIO",
]

@router.get("")
async def get_metrics(year: int = Query(2026), db=Depends(get_db)):
    deal_svc = DealService(db)
    # Exclude deleted deals
    deals, _ = await deal_svc.list_deals(limit=1000)
    deals = [d for d in deals if not getattr(d, 'deleted', False)]

    # Funnel
    stage_counts = {s: 0 for s in STAGE_ORDER}
    stage_values = {s: 0.0 for s in STAGE_ORDER}
    for deal in deals:
        stage = deal.stage if deal.stage in stage_counts else "PROSPECTO_IDENTIFICADO"
        stage_counts[stage] += 1
        stage_values[stage] += deal.value or 0

    funnel = [
        {"stage": s, "label": STAGE_LABELS[s], "count": stage_counts[s], "value": stage_values[s]}
        for s in STAGE_ORDER if s != "PERDIDO"
    ]

    # Solo se usan metas creadas manualmente por el admin
    goals_col = db["goals"]
    # Active pipeline deals (not lost) contribute to goal progress
    active_deals = [d for d in deals if d.stage != "PERDIDO"]
    goals_docs = await goals_col.find({"year": year}).to_list(length=None)
    goals_out = []
    for g in goals_docs:
        svc_filter = g.get("serviceType")
        relevant = [d for d in active_deals if d.serviceType == svc_filter]
        won_relevant = [d for d in relevant if d.stage == "GANADO"]
        # currentValue = won deals value; pipeline = all active deals value
        current_val = sum(d.value or 0 for d in won_relevant)
        pipeline_val = sum(d.value or 0 for d in relevant)
        current_units = len(won_relevant)
        await goals_col.update_one(
            {"_id": g["_id"]},
            {"$set": {"currentValue": current_val, "currentUnits": current_units, "pipelineValue": pipeline_val}}
        )
        goals_out.append({
            "id": g["_id"],
            "serviceType": svc_filter,
            "quarter": g.get("quarter"),
            "year": year,
            "targetValue": g.get("targetValue", 50_000_000),
            "targetUnits": g.get("targetUnits", 5),
            "currentValue": current_val,
            "pipelineValue": pipeline_val,
            "currentUnits": current_units,
            "region": g.get("region"),
            "userId": g.get("userId"),
        })

    # Batch fetch team member names for leaderboard
    assigned_ids = {d.assignedTo for d in deals if d.assignedTo}
    team_members = {}
    if assigned_ids:
        async for doc in db["team_members"].find({"_id": {"$in": list(assigned_ids)}}):
            team_members[doc["_id"]] = doc.get("name", doc["_id"])

    # Leaderboard
    owner_stats: dict = {}
    for deal in deals:
        owner = deal.assignedTo or "Sin asignar"
        owner_name = team_members.get(owner, owner)
        if owner_name not in owner_stats:
            owner_stats[owner_name] = {"name": owner_name, "won": 0, "pipeline": 0, "deals": 0}
        owner_stats[owner_name]["deals"] += 1
        owner_stats[owner_name]["pipeline"] += deal.ponderatedValue or 0
        if deal.stage == "GANADO":
            owner_stats[owner_name]["won"] += deal.value or 0

    leaderboard = sorted(owner_stats.values(), key=lambda x: x["won"], reverse=True)

    # Recent active deals (last 10, sorted by update)
    # NOTE: Cosmos DB requires an index for $sort; we fetch and sort in-memory.
    recent_docs = await db["deals"].find(
        {"stage": {"$nin": ["GANADO", "PERDIDO"]}, "deleted": {"$ne": True}}
    ).limit(200).to_list(length=200)
    recent_docs.sort(key=lambda d: d.get("updatedAt") or datetime.min, reverse=True)
    recent_docs = recent_docs[:10]

    recent_deals = []
    for doc in recent_docs:
        prospect_name = ""
        if doc.get("prospectId"):
            p = await db["prospects"].find_one({"_id": doc["prospectId"]})
            if p:
                prospect_name = p.get("name", "")
        recent_deals.append({
            "id": doc.get("_id", ""),
            "stage": doc.get("stage", ""),
            "serviceType": doc.get("serviceType", ""),
            "value": doc.get("value", 0),
            "nextAction": doc.get("nextAction", ""),
            "prospectName": prospect_name,
        })

    return {
        "data": {
            "funnel": funnel,
            "goals": goals_out,
            "leaderboard": leaderboard,
            "recentDeals": recent_deals,
            "summary": {
                "totalDeals": len(deals),
                "totalPipeline": sum(d.value or 0 for d in deals),
                "won": len([d for d in deals if d.stage == "GANADO"]),
                "lost": len([d for d in deals if d.stage == "PERDIDO"]),
            }
        }
    }
