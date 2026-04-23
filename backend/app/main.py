from __future__ import annotations

from datetime import datetime, timedelta
import uuid

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .database import Base, engine, get_db
from .enums import ActivityType, DealStage, SequenceStatus, ServiceType, StepOutcome, TemplateType, TriggerType
from .models import Activity, Contact, Deal, Goal, Prospect, SalesTrigger, Sequence, SequenceStep, Template, TemplateSequence
from .seed import seed_data
from .serializers import activity_dict, deal_dict, goal_dict, prospect_dict, sequence_dict, template_dict, template_sequence_dict, trigger_dict

app = FastAPI(title="Fabrica Ventas Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with next(get_db()) as db:
        seed_data(db)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class ProspectPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    name: str
    industry: str | None = None
    size: str | None = None
    region: str | None = None
    segment: str | None = None
    website: str | None = None
    linkedinUrl: str | None = None
    assignedTo: str | None = None


class ContactPayload(BaseModel):
    name: str
    prospectId: str
    role: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedinUrl: str | None = None
    isPrimary: bool = False


class DealPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    prospectId: str
    contactId: str | None = None
    serviceType: ServiceType
    stage: DealStage = DealStage.PROSPECTO_IDENTIFICADO
    value: float | None = None
    assignedTo: str | None = None
    quarter: int | None = None
    region: str | None = None
    lostReason: str | None = None


class ActivityPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    dealId: str | None = None
    prospectId: str | None = None
    type: ActivityType
    outcome: str | None = None
    notes: str | None = None
    templateUsed: str | None = None


class TemplatePayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    name: str
    type: TemplateType
    segment: str | None = None
    subject: str | None = None
    body: str
    serviceType: ServiceType | None = None


class TriggerPayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    prospectId: str
    triggerType: TriggerType
    description: str | None = None


class SequencePayload(BaseModel):
    prospectId: str
    dealId: str | None = None
    templateSequenceId: str


class SequenceUpdatePayload(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    stepNumber: int | None = None
    outcome: StepOutcome | None = None
    status: SequenceStatus | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/prospects")
def list_prospects(
    search: str = "",
    region: str | None = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Prospect).options(
        joinedload(Prospect.contacts),
        joinedload(Prospect.deals).joinedload(Deal.activities),
        joinedload(Prospect.triggers),
    )
    if search:
        query = query.filter(Prospect.name.ilike(f"%{search}%"))
    if region:
        query = query.filter(Prospect.region == region)

    total = query.count()
    prospects = (
        query.order_by(Prospect.createdAt.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {"data": {"prospects": [prospect_dict(item) for item in prospects], "total": total, "page": page, "limit": limit}, "error": None}


@app.post("/prospects")
def create_prospect(payload: ProspectPayload, db: Session = Depends(get_db)):
    prospect = Prospect(id=new_id("prospect"), **payload.model_dump())
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return {"data": prospect_dict(prospect), "error": None}


@app.get("/prospects/{prospect_id}")
def get_prospect(prospect_id: str, db: Session = Depends(get_db)):
    prospect = (
        db.query(Prospect)
        .options(
            joinedload(Prospect.contacts),
            joinedload(Prospect.deals).joinedload(Deal.activities),
            joinedload(Prospect.deals).joinedload(Deal.contact),
            joinedload(Prospect.deals).joinedload(Deal.assignedUser),
            joinedload(Prospect.triggers),
            joinedload(Prospect.activities).joinedload(Activity.createdBy),
            joinedload(Prospect.sequences).joinedload(Sequence.steps),
            joinedload(Prospect.sequences).joinedload(Sequence.templateSequence).joinedload(TemplateSequence.steps),
        )
        .filter(Prospect.id == prospect_id)
        .first()
    )
    if not prospect:
        raise HTTPException(status_code=404, detail="Not found")
    return {"data": prospect_dict(prospect), "error": None}


@app.patch("/prospects/{prospect_id}")
def update_prospect(prospect_id: str, payload: ProspectPayload, db: Session = Depends(get_db)):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prospect, key, value)
    db.commit()
    db.refresh(prospect)
    return {"data": prospect_dict(prospect), "error": None}


@app.delete("/prospects/{prospect_id}")
def delete_prospect(prospect_id: str, db: Session = Depends(get_db)):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(prospect)
    db.commit()
    return {"data": {"deleted": True}, "error": None}


@app.post("/contacts")
def create_contact(payload: ContactPayload, db: Session = Depends(get_db)):
    contact = Contact(id=new_id("contact"), **payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return {"data": {"id": contact.id, "name": contact.name, "prospectId": contact.prospectId}, "error": None}


@app.get("/deals")
def list_deals(
    region: str | None = None,
    serviceType: ServiceType | None = None,
    assignedTo: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Deal).options(
        joinedload(Deal.prospect),
        joinedload(Deal.contact),
        joinedload(Deal.assignedUser),
        joinedload(Deal.activities).joinedload(Activity.createdBy),
    )
    if region:
        query = query.filter(Deal.region == region)
    if serviceType:
        query = query.filter(Deal.serviceType == serviceType)
    if assignedTo:
        query = query.filter(Deal.assignedTo == assignedTo)

    deals = query.order_by(Deal.createdAt.desc()).all()
    return {"data": [deal_dict(item) for item in deals], "error": None}


@app.post("/deals")
def create_deal(payload: DealPayload, db: Session = Depends(get_db)):
    deal = Deal(id=new_id("deal"), **payload.model_dump())
    if deal.stage == DealStage.GANADO and not deal.wonAt:
        deal.wonAt = datetime.utcnow()
    db.add(deal)
    db.commit()
    db.refresh(deal)
    deal = db.query(Deal).options(joinedload(Deal.prospect), joinedload(Deal.contact), joinedload(Deal.assignedUser), joinedload(Deal.activities)).filter(Deal.id == deal.id).first()
    return {"data": deal_dict(deal), "error": None}


@app.patch("/deals/{deal_id}")
def update_deal(deal_id: str, payload: dict, db: Session = Depends(get_db)):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Not found")
    for key, value in payload.items():
        if hasattr(deal, key):
            setattr(deal, key, value)
    if deal.stage == DealStage.GANADO and not deal.wonAt:
        deal.wonAt = datetime.utcnow()
    db.commit()
    deal = db.query(Deal).options(joinedload(Deal.prospect), joinedload(Deal.contact), joinedload(Deal.assignedUser), joinedload(Deal.activities)).filter(Deal.id == deal_id).first()
    return {"data": deal_dict(deal), "error": None}


@app.get("/activities")
def list_activities(
    today: bool = False,
    x_user_id: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Activity).options(joinedload(Activity.prospect), joinedload(Activity.deal), joinedload(Activity.createdBy))
    if x_user_id:
        query = query.filter(Activity.createdById == x_user_id)
    if today:
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        query = query.filter(Activity.doneAt >= start, Activity.doneAt < end)
    activities = query.order_by(Activity.doneAt.desc()).limit(50).all()
    return {"data": [activity_dict(item) for item in activities], "error": None}


@app.post("/activities")
def create_activity(payload: ActivityPayload, x_user_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    activity = Activity(id=new_id("activity"), createdById=x_user_id, **payload.model_dump())
    db.add(activity)
    db.commit()
    activity = db.query(Activity).options(joinedload(Activity.prospect), joinedload(Activity.deal), joinedload(Activity.createdBy)).filter(Activity.id == activity.id).first()
    return {"data": activity_dict(activity), "error": None}


@app.get("/templates")
def list_templates(
    type: TemplateType | None = Query(default=None),
    service: ServiceType | None = Query(default=None),
    segment: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Template)
    if type:
        query = query.filter(Template.type == type)
    if service:
        query = query.filter(Template.serviceType == service)
    if segment:
        query = query.filter(Template.segment.ilike(f"%{segment}%"))
    templates = query.order_by(Template.createdAt.asc()).all()
    return {"data": [template_dict(item) for item in templates], "error": None}


@app.post("/templates")
def create_template(payload: TemplatePayload, x_user_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    template = Template(id=new_id("template"), createdById=x_user_id, **payload.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return {"data": template_dict(template), "error": None}


@app.get("/template-sequences")
def list_template_sequences(db: Session = Depends(get_db)):
    sequences = db.query(TemplateSequence).options(joinedload(TemplateSequence.steps).joinedload(SequenceStep.template)).order_by(TemplateSequence.createdAt.asc()).all()
    return {"data": [template_sequence_dict(item) for item in sequences], "error": None}


@app.get("/sequences")
def list_sequences(db: Session = Depends(get_db)):
    sequences = (
        db.query(Sequence)
        .options(
            joinedload(Sequence.prospect),
            joinedload(Sequence.deal).joinedload(Deal.prospect),
            joinedload(Sequence.templateSequence).joinedload(TemplateSequence.steps),
            joinedload(Sequence.steps).joinedload(SequenceStep.template),
        )
        .filter(Sequence.status != SequenceStatus.COMPLETED)
        .order_by(Sequence.startedAt.desc())
        .all()
    )
    return {"data": [sequence_dict(item) for item in sequences], "error": None}


@app.post("/sequences")
def create_sequence(payload: SequencePayload, db: Session = Depends(get_db)):
    template_sequence = (
        db.query(TemplateSequence)
        .options(joinedload(TemplateSequence.steps))
        .filter(TemplateSequence.id == payload.templateSequenceId)
        .first()
    )
    if not template_sequence:
        raise HTTPException(status_code=404, detail="Template sequence not found")

    sequence = Sequence(
        id=new_id("sequence"),
        prospectId=payload.prospectId,
        dealId=payload.dealId,
        templateSequenceId=payload.templateSequenceId,
        status=SequenceStatus.ACTIVE,
        currentStep=0,
    )
    db.add(sequence)
    db.flush()

    for step in sorted(template_sequence.steps, key=lambda item: item.stepNumber):
        db.add(
            SequenceStep(
                id=new_id("step"),
                sequenceId=sequence.id,
                stepNumber=step.stepNumber,
                type=step.type,
                scheduledAt=datetime.utcnow() + timedelta(days=step.dayOffset),
                templateId=step.templateId,
            )
        )

    db.commit()
    sequence = (
        db.query(Sequence)
        .options(joinedload(Sequence.prospect), joinedload(Sequence.templateSequence).joinedload(TemplateSequence.steps), joinedload(Sequence.steps).joinedload(SequenceStep.template))
        .filter(Sequence.id == sequence.id)
        .first()
    )
    return {"data": sequence_dict(sequence), "error": None}


@app.patch("/sequences/{sequence_id}")
def update_sequence(sequence_id: str, payload: SequenceUpdatePayload, db: Session = Depends(get_db)):
    sequence = db.query(Sequence).options(joinedload(Sequence.steps)).filter(Sequence.id == sequence_id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Not found")

    if payload.stepNumber is not None and payload.outcome is not None:
        step = next((item for item in sequence.steps if item.stepNumber == payload.stepNumber), None)
        if not step:
            raise HTTPException(status_code=404, detail="Step not found")
        step.outcome = payload.outcome
        step.sentAt = datetime.utcnow()
        pending_steps = sorted([item for item in sequence.steps if item.outcome is None], key=lambda item: item.stepNumber)
        sequence.currentStep = pending_steps[0].stepNumber if pending_steps else step.stepNumber

    if payload.status is not None:
        sequence.status = payload.status

    db.commit()
    return {"success": True}


@app.get("/triggers")
def list_triggers(db: Session = Depends(get_db)):
    triggers = db.query(SalesTrigger).options(joinedload(SalesTrigger.prospect)).filter(SalesTrigger.usedInOutreach.is_(False)).order_by(SalesTrigger.detectedAt.desc()).all()
    return {"data": [trigger_dict(item) for item in triggers], "error": None}


@app.post("/triggers")
def create_trigger(payload: TriggerPayload, db: Session = Depends(get_db)):
    trigger = SalesTrigger(id=new_id("trigger"), **payload.model_dump())
    db.add(trigger)
    db.commit()
    trigger = db.query(SalesTrigger).options(joinedload(SalesTrigger.prospect)).filter(SalesTrigger.id == trigger.id).first()
    return {"data": trigger_dict(trigger), "error": None}


@app.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    goals = db.query(Goal).options(joinedload(Goal.user)).filter(Goal.year == 2026).all()
    deals = db.query(Deal).options(joinedload(Deal.assignedUser)).all()
    users = db.query(Deal.assignedTo, func.count(Deal.id)).group_by(Deal.assignedTo).all()

    funnel_stages = [
        DealStage.PROSPECTO_IDENTIFICADO,
        DealStage.PRIMER_CONTACTO,
        DealStage.REUNION_AGENDADA,
        DealStage.PROPUESTA_ENVIADA,
        DealStage.GANADO,
    ]
    funnel = [{"stage": stage.value, "count": len([deal for deal in deals if deal.stage == stage])} for stage in funnel_stages]

    leaderboard = []
    for deal_owner, _ in users:
        owner_deals = [deal for deal in deals if deal.assignedTo == deal_owner and deal.stage == DealStage.GANADO]
        if owner_deals:
            leaderboard.append(
                {
                    "name": owner_deals[0].assignedUser.name if owner_deals[0].assignedUser else "Sin asignar",
                    "wonCount": len(owner_deals),
                    "wonValue": sum(deal.value or 0 for deal in owner_deals),
                }
            )
    leaderboard.sort(key=lambda item: item["wonCount"], reverse=True)

    enriched_goals = []
    for goal in goals:
        related_deals = [
            deal
            for deal in deals
            if deal.stage == DealStage.GANADO
            and deal.serviceType == goal.serviceType
            and (goal.region is None or deal.region == goal.region)
            and (goal.userId is None or deal.assignedTo == goal.userId)
        ]
        goal.currentUnits = len(related_deals)
        goal.currentValue = sum(deal.value or 0 for deal in related_deals)
        enriched_goals.append(goal_dict(goal))

    return {"data": {"goals": enriched_goals, "funnel": funnel, "leaderboard": leaderboard}, "error": None}
