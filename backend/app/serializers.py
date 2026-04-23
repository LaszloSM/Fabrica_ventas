from __future__ import annotations

from typing import Any

from .models import Activity, Contact, Deal, Goal, Prospect, SalesTrigger, Sequence, SequenceStep, Template, TemplateSequence, TemplateSequenceStep, User


def iso(value):
    return value.isoformat() if value else None


def user_dict(user: User | None) -> dict[str, Any] | None:
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "region": user.region,
        "image": user.image,
        "createdAt": iso(user.createdAt),
        "updatedAt": iso(user.updatedAt),
    }


def contact_dict(contact: Contact) -> dict[str, Any]:
    return {
        "id": contact.id,
        "prospectId": contact.prospectId,
        "name": contact.name,
        "role": contact.role,
        "email": contact.email,
        "phone": contact.phone,
        "linkedinUrl": contact.linkedinUrl,
        "isPrimary": contact.isPrimary,
        "createdAt": iso(contact.createdAt),
        "updatedAt": iso(contact.updatedAt),
    }


def activity_dict(activity: Activity) -> dict[str, Any]:
    return {
        "id": activity.id,
        "dealId": activity.dealId,
        "prospectId": activity.prospectId,
        "type": activity.type.value,
        "templateUsed": activity.templateUsed,
        "outcome": activity.outcome,
        "notes": activity.notes,
        "doneAt": iso(activity.doneAt),
        "createdById": activity.createdById,
        "createdAt": iso(activity.createdAt),
        "prospect": {"id": activity.prospect.id, "name": activity.prospect.name} if activity.prospect else None,
        "deal": {"id": activity.deal.id, "serviceType": activity.deal.serviceType.value} if activity.deal else None,
        "createdBy": {"id": activity.createdBy.id, "name": activity.createdBy.name} if activity.createdBy else None,
    }


def template_dict(template: Template) -> dict[str, Any]:
    return {
        "id": template.id,
        "name": template.name,
        "type": template.type.value,
        "segment": template.segment,
        "subject": template.subject,
        "body": template.body,
        "serviceType": template.serviceType.value if template.serviceType else None,
        "createdById": template.createdById,
        "createdAt": iso(template.createdAt),
        "updatedAt": iso(template.updatedAt),
    }


def template_sequence_step_dict(step: TemplateSequenceStep) -> dict[str, Any]:
    return {
        "id": step.id,
        "templateSequenceId": step.templateSequenceId,
        "stepNumber": step.stepNumber,
        "type": step.type.value,
        "dayOffset": step.dayOffset,
        "templateId": step.templateId,
        "description": step.description,
        "template": template_dict(step.template) if step.template else None,
    }


def template_sequence_dict(sequence: TemplateSequence) -> dict[str, Any]:
    return {
        "id": sequence.id,
        "name": sequence.name,
        "description": sequence.description,
        "createdAt": iso(sequence.createdAt),
        "steps": [template_sequence_step_dict(step) for step in sorted(sequence.steps, key=lambda item: item.stepNumber)],
    }


def sequence_step_dict(step: SequenceStep) -> dict[str, Any]:
    return {
        "id": step.id,
        "sequenceId": step.sequenceId,
        "stepNumber": step.stepNumber,
        "type": step.type.value,
        "scheduledAt": iso(step.scheduledAt),
        "sentAt": iso(step.sentAt),
        "outcome": step.outcome.value if step.outcome else None,
        "templateId": step.templateId,
        "template": template_dict(step.template) if step.template else None,
    }


def deal_dict(deal: Deal) -> dict[str, Any]:
    return {
        "id": deal.id,
        "prospectId": deal.prospectId,
        "contactId": deal.contactId,
        "serviceType": deal.serviceType.value,
        "stage": deal.stage.value,
        "value": deal.value,
        "assignedTo": deal.assignedTo,
        "quarter": deal.quarter,
        "region": deal.region,
        "lostReason": deal.lostReason,
        "wonAt": iso(deal.wonAt),
        "createdAt": iso(deal.createdAt),
        "updatedAt": iso(deal.updatedAt),
        "prospect": prospect_dict(deal.prospect, nested=True) if deal.prospect else None,
        "contact": contact_dict(deal.contact) if deal.contact else None,
        "assignedUser": user_dict(deal.assignedUser),
        "activities": [activity_dict(activity) for activity in sorted(deal.activities, key=lambda item: item.doneAt, reverse=True)],
    }


def sequence_dict(sequence: Sequence) -> dict[str, Any]:
    return {
        "id": sequence.id,
        "prospectId": sequence.prospectId,
        "dealId": sequence.dealId,
        "templateSequenceId": sequence.templateSequenceId,
        "currentStep": sequence.currentStep,
        "status": sequence.status.value,
        "startedAt": iso(sequence.startedAt),
        "createdAt": iso(sequence.createdAt),
        "updatedAt": iso(sequence.updatedAt),
        "prospect": prospect_dict(sequence.prospect, nested=True) if sequence.prospect else None,
        "deal": deal_dict(sequence.deal) if sequence.deal else None,
        "templateSequence": template_sequence_dict(sequence.templateSequence) if sequence.templateSequence else None,
        "steps": [sequence_step_dict(step) for step in sorted(sequence.steps, key=lambda item: item.stepNumber)],
    }


def trigger_dict(trigger: SalesTrigger) -> dict[str, Any]:
    return {
        "id": trigger.id,
        "prospectId": trigger.prospectId,
        "triggerType": trigger.triggerType.value,
        "description": trigger.description,
        "detectedAt": iso(trigger.detectedAt),
        "usedInOutreach": trigger.usedInOutreach,
        "createdAt": iso(trigger.createdAt),
        "prospect": prospect_dict(trigger.prospect, nested=True) if trigger.prospect else None,
    }


def prospect_dict(prospect: Prospect, nested: bool = False) -> dict[str, Any]:
    payload = {
        "id": prospect.id,
        "name": prospect.name,
        "industry": prospect.industry,
        "size": prospect.size,
        "region": prospect.region,
        "segment": prospect.segment,
        "website": prospect.website,
        "linkedinUrl": prospect.linkedinUrl,
        "assignedTo": prospect.assignedTo,
        "createdAt": iso(prospect.createdAt),
        "updatedAt": iso(prospect.updatedAt),
    }
    if nested:
        return payload

    payload.update(
        {
            "contacts": [contact_dict(contact) for contact in prospect.contacts],
            "deals": [deal_dict(deal) for deal in sorted(prospect.deals, key=lambda item: item.createdAt, reverse=True)],
            "triggers": [trigger_dict(trigger) for trigger in sorted(prospect.triggers, key=lambda item: item.detectedAt, reverse=True)],
            "activities": [activity_dict(activity) for activity in sorted(prospect.activities, key=lambda item: item.doneAt, reverse=True)],
            "sequences": [sequence_dict(sequence) for sequence in sorted(prospect.sequences, key=lambda item: item.startedAt, reverse=True)],
        }
    )
    return payload


def goal_dict(goal: Goal) -> dict[str, Any]:
    return {
        "id": goal.id,
        "userId": goal.userId,
        "region": goal.region,
        "serviceType": goal.serviceType.value,
        "quarter": goal.quarter,
        "year": goal.year,
        "targetValue": goal.targetValue,
        "targetUnits": goal.targetUnits,
        "currentValue": goal.currentValue,
        "currentUnits": goal.currentUnits,
        "createdAt": iso(goal.createdAt),
        "updatedAt": iso(goal.updatedAt),
        "user": user_dict(goal.user),
    }
