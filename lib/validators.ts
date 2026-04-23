import { z } from 'zod'
import { ServiceType, DealStage, ActivityType, TriggerType } from '@/types'

export const ProspectSchema = z.object({
  name:        z.string().min(1),
  industry:    z.string().optional(),
  size:        z.string().optional(),
  region:      z.string().optional(),
  segment:     z.string().optional(),
  website:     z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  assignedTo:  z.string().optional(),
})

export const DealSchema = z.object({
  prospectId:  z.string(),
  contactId:   z.string().optional(),
  serviceType: z.nativeEnum(ServiceType),
  stage:       z.nativeEnum(DealStage).optional(),
  value:       z.number().optional(),
  assignedTo:  z.string().optional(),
  quarter:     z.number().int().min(1).max(4).optional(),
  region:      z.string().optional(),
})

export const ActivitySchema = z.object({
  dealId:      z.string().optional(),
  prospectId:  z.string().optional(),
  type:        z.nativeEnum(ActivityType),
  outcome:     z.string().optional(),
  notes:       z.string().optional(),
  templateUsed: z.string().optional(),
})

export const ContactSchema = z.object({
  prospectId:  z.string(),
  name:        z.string().min(1),
  role:        z.string().optional(),
  email:       z.string().email().optional().or(z.literal('')),
  phone:       z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  isPrimary:   z.boolean().optional(),
})
