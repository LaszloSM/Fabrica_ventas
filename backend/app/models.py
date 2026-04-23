from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .enums import (
    ActivityType,
    DealStage,
    SequenceStatus,
    ServiceType,
    StepOutcome,
    TemplateType,
    TriggerType,
    UserRole,
)


def now() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.SALES)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    deals: Mapped[list["Deal"]] = relationship(back_populates="assignedUser")
    activities: Mapped[list["Activity"]] = relationship(back_populates="createdBy")
    goals: Mapped[list["Goal"]] = relationship(back_populates="user")


class Prospect(Base):
    __tablename__ = "prospects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    size: Mapped[str | None] = mapped_column(String, nullable=True)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    segment: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    linkedinUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    assignedTo: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    contacts: Mapped[list["Contact"]] = relationship(back_populates="prospect", cascade="all, delete-orphan")
    deals: Mapped[list["Deal"]] = relationship(back_populates="prospect", cascade="all, delete-orphan")
    sequences: Mapped[list["Sequence"]] = relationship(back_populates="prospect", cascade="all, delete-orphan")
    triggers: Mapped[list["SalesTrigger"]] = relationship(back_populates="prospect", cascade="all, delete-orphan")
    activities: Mapped[list["Activity"]] = relationship(back_populates="prospect")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    prospectId: Mapped[str] = mapped_column(ForeignKey("prospects.id"))
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    linkedinUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    isPrimary: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    prospect: Mapped[Prospect] = relationship(back_populates="contacts")
    deals: Mapped[list["Deal"]] = relationship(back_populates="contact")


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    prospectId: Mapped[str] = mapped_column(ForeignKey("prospects.id"))
    contactId: Mapped[str | None] = mapped_column(ForeignKey("contacts.id"), nullable=True)
    serviceType: Mapped[ServiceType] = mapped_column(Enum(ServiceType))
    stage: Mapped[DealStage] = mapped_column(Enum(DealStage), default=DealStage.PROSPECTO_IDENTIFICADO)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    assignedTo: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    quarter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    lostReason: Mapped[str | None] = mapped_column(Text, nullable=True)
    wonAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    prospect: Mapped[Prospect] = relationship(back_populates="deals")
    contact: Mapped[Contact | None] = relationship(back_populates="deals")
    assignedUser: Mapped[User | None] = relationship(back_populates="deals")
    activities: Mapped[list["Activity"]] = relationship(back_populates="deal")
    sequences: Mapped[list["Sequence"]] = relationship(back_populates="deal")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    dealId: Mapped[str | None] = mapped_column(ForeignKey("deals.id"), nullable=True)
    prospectId: Mapped[str | None] = mapped_column(ForeignKey("prospects.id"), nullable=True)
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType))
    templateUsed: Mapped[str | None] = mapped_column(String, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    doneAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    createdById: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)

    deal: Mapped[Deal | None] = relationship(back_populates="activities")
    prospect: Mapped[Prospect | None] = relationship(back_populates="activities")
    createdBy: Mapped[User | None] = relationship(back_populates="activities")


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[TemplateType] = mapped_column(Enum(TemplateType))
    segment: Mapped[str | None] = mapped_column(String, nullable=True)
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    body: Mapped[str] = mapped_column(Text)
    serviceType: Mapped[ServiceType | None] = mapped_column(Enum(ServiceType), nullable=True)
    createdById: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class TemplateSequence(Base):
    __tablename__ = "template_sequences"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)

    steps: Mapped[list["TemplateSequenceStep"]] = relationship(back_populates="templateSequence", cascade="all, delete-orphan")
    sequences: Mapped[list["Sequence"]] = relationship(back_populates="templateSequence")


class TemplateSequenceStep(Base):
    __tablename__ = "template_sequence_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    templateSequenceId: Mapped[str] = mapped_column(ForeignKey("template_sequences.id"))
    stepNumber: Mapped[int] = mapped_column(Integer)
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType))
    dayOffset: Mapped[int] = mapped_column(Integer)
    templateId: Mapped[str | None] = mapped_column(ForeignKey("templates.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    templateSequence: Mapped[TemplateSequence] = relationship(back_populates="steps")
    template: Mapped[Template | None] = relationship()


class Sequence(Base):
    __tablename__ = "sequences"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    prospectId: Mapped[str] = mapped_column(ForeignKey("prospects.id"))
    dealId: Mapped[str | None] = mapped_column(ForeignKey("deals.id"), nullable=True)
    templateSequenceId: Mapped[str | None] = mapped_column(ForeignKey("template_sequences.id"), nullable=True)
    currentStep: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[SequenceStatus] = mapped_column(Enum(SequenceStatus), default=SequenceStatus.ACTIVE)
    startedAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    prospect: Mapped[Prospect] = relationship(back_populates="sequences")
    deal: Mapped[Deal | None] = relationship(back_populates="sequences")
    templateSequence: Mapped[TemplateSequence | None] = relationship(back_populates="sequences")
    steps: Mapped[list["SequenceStep"]] = relationship(back_populates="sequence", cascade="all, delete-orphan")


class SequenceStep(Base):
    __tablename__ = "sequence_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    sequenceId: Mapped[str] = mapped_column(ForeignKey("sequences.id"))
    stepNumber: Mapped[int] = mapped_column(Integer)
    type: Mapped[ActivityType] = mapped_column(Enum(ActivityType))
    scheduledAt: Mapped[datetime] = mapped_column(DateTime)
    sentAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    outcome: Mapped[StepOutcome | None] = mapped_column(Enum(StepOutcome), nullable=True)
    templateId: Mapped[str | None] = mapped_column(ForeignKey("templates.id"), nullable=True)

    sequence: Mapped[Sequence] = relationship(back_populates="steps")
    template: Mapped[Template | None] = relationship()


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    serviceType: Mapped[ServiceType] = mapped_column(Enum(ServiceType))
    quarter: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    targetValue: Mapped[float | None] = mapped_column(Float, nullable=True)
    targetUnits: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currentValue: Mapped[float] = mapped_column(Float, default=0)
    currentUnits: Mapped[int] = mapped_column(Integer, default=0)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    user: Mapped[User | None] = relationship(back_populates="goals")


class SalesTrigger(Base):
    __tablename__ = "sales_triggers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    prospectId: Mapped[str] = mapped_column(ForeignKey("prospects.id"))
    triggerType: Mapped[TriggerType] = mapped_column(Enum(TriggerType))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    detectedAt: Mapped[datetime] = mapped_column(DateTime, default=now)
    usedInOutreach: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=now)

    prospect: Mapped[Prospect] = relationship(back_populates="triggers")
