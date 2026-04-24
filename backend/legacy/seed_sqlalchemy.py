from __future__ import annotations

from datetime import datetime, timedelta
import uuid

from sqlalchemy.orm import Session

from .enums import ActivityType, DealStage, SequenceStatus, ServiceType, TemplateType, TriggerType, UserRole
from .models import Activity, Contact, Deal, Goal, Prospect, SalesTrigger, Sequence, SequenceStep, Template, TemplateSequence, TemplateSequenceStep, User


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def seed_data(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    users = [
        User(id="user_paola", name="Paola", email="paola@coimpactob.org", role=UserRole.SALES, region="Antioquia"),
        User(id="user_keyla", name="Keyla", email="keyla@coimpactob.org", role=UserRole.SALES, region="Antioquia"),
        User(id="user_daniel", name="Daniel", email="daniel@coimpactob.org", role=UserRole.SALES, region="Cundinamarca"),
        User(id="user_admin", name="Admin", email="admin@coimpactob.org", role=UserRole.ADMIN),
    ]
    db.add_all(users)

    goals = [
        Goal(id=uid("goal"), region="Antioquia", serviceType=ServiceType.CREDIMPACTO_GRUPOS, quarter=2, year=2026, targetUnits=2, targetValue=None),
        Goal(id=uid("goal"), region="Cundinamarca", serviceType=ServiceType.CREDIMPACTO_GRUPOS, quarter=3, year=2026, targetUnits=2, targetValue=None),
        Goal(id=uid("goal"), region="Nacional", serviceType=ServiceType.FUNDACION_CONVENIO, quarter=4, year=2026, targetUnits=10, targetValue=800_000_000),
        Goal(id=uid("goal"), region="Otros", serviceType=ServiceType.CONSULTORIA_PROYECTO, quarter=4, year=2026, targetUnits=2, targetValue=750_000_000),
    ]
    db.add_all(goals)

    templates = [
        Template(
            id="tpl_trigger",
            name="Email #1 - Senal de Venta",
            type=TemplateType.EMAIL_COLD,
            segment="General",
            subject="Vi que {{empresa}} esta {{trigger}}",
            body="Hola {{nombre}}, vi una oportunidad clara para {{empresa}} y me gustaria conversar.",
        ),
        Template(
            id="tpl_followup",
            name="Email #2 - Follow-up consultivo",
            type=TemplateType.EMAIL_FOLLOWUP,
            segment="General",
            subject="Retomo mi mensaje anterior",
            body="Hola {{nombre}}, queria retomar mi mensaje sobre {{problema}} y ver si vale la pena hablar.",
        ),
        Template(
            id="tpl_linkedin",
            name="LinkedIn - Mensaje corto",
            type=TemplateType.LINKEDIN_MESSAGE,
            segment="General",
            body="Hola {{nombre}}, vi el trabajo de {{empresa}} y creo que podemos aportar.",
        ),
        Template(
            id="tpl_call",
            name="Guion de llamada - Diagnostico",
            type=TemplateType.CALL_SCRIPT,
            segment="General",
            body="Abrir con contexto, validar prioridad y cerrar con siguiente paso.",
        ),
    ]
    db.add_all(templates)

    base_sequence = TemplateSequence(
        id="seq_base",
        name="Secuencia base de acercamiento",
        description="Secuencia simple para trigger + follow-up + llamada",
        steps=[
            TemplateSequenceStep(id=uid("tss"), stepNumber=1, type=ActivityType.EMAIL, dayOffset=0, templateId="tpl_trigger", description="Primer correo"),
            TemplateSequenceStep(id=uid("tss"), stepNumber=2, type=ActivityType.LINKEDIN, dayOffset=2, templateId="tpl_linkedin", description="Conexion LinkedIn"),
            TemplateSequenceStep(id=uid("tss"), stepNumber=3, type=ActivityType.EMAIL, dayOffset=5, templateId="tpl_followup", description="Follow-up"),
            TemplateSequenceStep(id=uid("tss"), stepNumber=4, type=ActivityType.CALL, dayOffset=8, templateId="tpl_call", description="Llamada"),
        ],
    )
    db.add(base_sequence)

    prospect_1 = Prospect(
        id="prospect_alianza",
        name="Alianza Productiva Norte",
        industry="Agro",
        region="Antioquia",
        segment="Aliados territoriales",
        website="https://alianza-productiva.example",
    )
    prospect_2 = Prospect(
        id="prospect_fundacion",
        name="Fundacion Semillas Vivas",
        industry="Fundacion",
        region="Cundinamarca",
        segment="Fundaciones",
        website="https://semillas-vivas.example",
    )
    prospect_3 = Prospect(
        id="prospect_caja",
        name="Caja Solidaria Guajira",
        industry="Finanzas",
        region="La Guajira",
        segment="Microfinanzas",
        website="https://caja-solidaria.example",
    )
    db.add_all([prospect_1, prospect_2, prospect_3])

    contacts = [
        Contact(id=uid("contact"), prospectId=prospect_1.id, name="Laura Mejia", role="Directora", email="laura@alianza.example", isPrimary=True),
        Contact(id=uid("contact"), prospectId=prospect_2.id, name="Carlos Perez", role="Coordinador", email="carlos@semillas.example", isPrimary=True),
    ]
    db.add_all(contacts)

    deals = [
        Deal(
            id="deal_1",
            prospectId=prospect_1.id,
            contactId=contacts[0].id,
            serviceType=ServiceType.CREDIMPACTO_GRUPOS,
            stage=DealStage.REUNION_AGENDADA,
            value=120_000_000,
            assignedTo="user_paola",
            quarter=2,
            region="Antioquia",
        ),
        Deal(
            id="deal_2",
            prospectId=prospect_2.id,
            contactId=contacts[1].id,
            serviceType=ServiceType.FUNDACION_CONVENIO,
            stage=DealStage.PROPUESTA_ENVIADA,
            value=240_000_000,
            assignedTo="user_daniel",
            quarter=3,
            region="Cundinamarca",
        ),
        Deal(
            id="deal_3",
            prospectId=prospect_3.id,
            serviceType=ServiceType.CONSULTORIA_PROYECTO,
            stage=DealStage.GANADO,
            value=380_000_000,
            assignedTo="user_keyla",
            quarter=4,
            region="La Guajira",
            wonAt=datetime.utcnow() - timedelta(days=3),
        ),
    ]
    db.add_all(deals)

    activities = [
        Activity(id=uid("activity"), dealId="deal_1", prospectId=prospect_1.id, type=ActivityType.EMAIL, notes="Primer acercamiento enviado", createdById="user_paola", doneAt=datetime.utcnow() - timedelta(days=1)),
        Activity(id=uid("activity"), dealId="deal_2", prospectId=prospect_2.id, type=ActivityType.MEETING, notes="Reunion de descubrimiento", createdById="user_daniel", doneAt=datetime.utcnow() - timedelta(days=4)),
        Activity(id=uid("activity"), dealId="deal_3", prospectId=prospect_3.id, type=ActivityType.CALL, notes="Cierre exitoso", createdById="user_keyla", doneAt=datetime.utcnow() - timedelta(days=2)),
    ]
    db.add_all(activities)

    trigger = SalesTrigger(
        id=uid("trigger"),
        prospectId=prospect_1.id,
        triggerType=TriggerType.EXPANSION,
        description="Anunciaron expansion a nuevos municipios",
    )
    db.add(trigger)

    sequence = Sequence(
        id="sequence_1",
        prospectId=prospect_1.id,
        dealId="deal_1",
        templateSequenceId="seq_base",
        status=SequenceStatus.ACTIVE,
        currentStep=1,
        steps=[
            SequenceStep(id=uid("step"), stepNumber=1, type=ActivityType.EMAIL, scheduledAt=datetime.utcnow() - timedelta(days=1), sentAt=datetime.utcnow() - timedelta(days=1), templateId="tpl_trigger"),
            SequenceStep(id=uid("step"), stepNumber=2, type=ActivityType.LINKEDIN, scheduledAt=datetime.utcnow() + timedelta(days=1), templateId="tpl_linkedin"),
            SequenceStep(id=uid("step"), stepNumber=3, type=ActivityType.EMAIL, scheduledAt=datetime.utcnow() + timedelta(days=4), templateId="tpl_followup"),
        ],
    )
    db.add(sequence)

    db.commit()
