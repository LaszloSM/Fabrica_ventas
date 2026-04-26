export const UserRole = {
  ADMIN: 'ADMIN',
  SALES: 'SALES',
  VIEWER: 'VIEWER',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const ServiceType = {
  CREDIMPACTO_GRUPOS: 'CREDIMPACTO_GRUPOS',
  CREDIMPACTO_FONDO_ROTATORIO: 'CREDIMPACTO_FONDO_ROTATORIO',
  CREDIMPACTO_CREDITOS: 'CREDIMPACTO_CREDITOS',
  CREDIMPACTO_PROVEEDORES: 'CREDIMPACTO_PROVEEDORES',
  ACADEMIA_CURSO: 'ACADEMIA_CURSO',
  CONSULTORIA_PROYECTO: 'CONSULTORIA_PROYECTO',
  FUNDACION_CONVENIO: 'FUNDACION_CONVENIO',
  FUNDACION_CONVOCATORIA: 'FUNDACION_CONVOCATORIA',
  FUNDACION_FUNDRAISING: 'FUNDACION_FUNDRAISING',
  FUNDACION_EXPERIENCIA: 'FUNDACION_EXPERIENCIA',
} as const

export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType]

export const DealStage = {
  PROSPECTO_IDENTIFICADO: 'PROSPECTO_IDENTIFICADO',
  SENAL_DETECTADA: 'SENAL_DETECTADA',
  PRIMER_CONTACTO: 'PRIMER_CONTACTO',
  EN_SECUENCIA: 'EN_SECUENCIA',
  REUNION_AGENDADA: 'REUNION_AGENDADA',
  PROPUESTA_ENVIADA: 'PROPUESTA_ENVIADA',
  NEGOCIACION: 'NEGOCIACION',
  GANADO: 'GANADO',
  PERDIDO: 'PERDIDO',
} as const

export type DealStage = (typeof DealStage)[keyof typeof DealStage]

export const ActivityType = {
  EMAIL: 'EMAIL',
  LINKEDIN: 'LINKEDIN',
  CALL: 'CALL',
  MEETING: 'MEETING',
  NOTE: 'NOTE',
} as const

export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

export const SequenceStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
} as const

export type SequenceStatus = (typeof SequenceStatus)[keyof typeof SequenceStatus]

export const TemplateType = {
  EMAIL_COLD: 'EMAIL_COLD',
  EMAIL_FOLLOWUP: 'EMAIL_FOLLOWUP',
  LINKEDIN_MESSAGE: 'LINKEDIN_MESSAGE',
  LINKEDIN_TRIGGER: 'LINKEDIN_TRIGGER',
  CALL_SCRIPT: 'CALL_SCRIPT',
  VOICEMAIL: 'VOICEMAIL',
} as const

export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType]

export const StepOutcome = {
  REPLIED: 'REPLIED',
  NO_REPLY: 'NO_REPLY',
  BOUNCED: 'BOUNCED',
  MEETING_BOOKED: 'MEETING_BOOKED',
} as const

export type StepOutcome = (typeof StepOutcome)[keyof typeof StepOutcome]

export const TriggerType = {
  EXPANSION: 'EXPANSION',
  NUEVO_PROYECTO: 'NUEVO_PROYECTO',
  CONVOCATORIA: 'CONVOCATORIA',
  EVENTO: 'EVENTO',
  PUBLICACION: 'PUBLICACION',
  PRESUPUESTO: 'PRESUPUESTO',
  CONTACTO_PREVIO: 'CONTACTO_PREVIO',
  REFERIDO: 'REFERIDO',
} as const

export type TriggerType = (typeof TriggerType)[keyof typeof TriggerType]

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  region?: string | null
  image?: string | null
  createdAt: string
  updatedAt: string
}

export interface Prospect {
  id: string
  name: string
  industry?: string | null
  size?: string | null
  region?: string | null
  segment?: string | null
  website?: string | null
  linkedinUrl?: string | null
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  prospectId: string
  name: string
  role?: string | null
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  dealId?: string | null
  prospectId?: string | null
  type: ActivityType
  templateUsed?: string | null
  outcome?: string | null
  notes?: string | null
  doneAt: string
  createdById?: string | null
  createdAt: string
  prospect?: Pick<Prospect, 'id' | 'name'>
  deal?: Pick<Deal, 'id' | 'serviceType'>
  createdBy?: Pick<User, 'id' | 'name'>
}

export interface Deal {
  id: string
  prospectId: string
  contactId?: string | null
  serviceType: ServiceType
  stage: DealStage
  value?: number | null
  assignedTo?: string | null
  quarter?: number | null
  region?: string | null
  lostReason?: string | null
  wonAt?: string | null
  proyectos?: string | null
  sourceTab?: string | null
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  name: string
  type: TemplateType
  segment?: string | null
  subject?: string | null
  body: string
  serviceType?: ServiceType | null
  createdById?: string | null
  createdAt: string
  updatedAt: string
}

export interface TemplateSequenceStep {
  id: string
  templateSequenceId: string
  stepNumber: number
  type: ActivityType
  dayOffset: number
  templateId?: string | null
  description?: string | null
  template?: Template | null
}

export interface TemplateSequence {
  id: string
  name: string
  description?: string | null
  createdAt: string
  steps?: TemplateSequenceStep[]
}

export interface SequenceStep {
  id: string
  sequenceId: string
  stepNumber: number
  type: ActivityType
  scheduledAt: string
  sentAt?: string | null
  outcome?: StepOutcome | null
  templateId?: string | null
  template?: Template | null
}

export interface Sequence {
  id: string
  prospectId: string
  dealId?: string | null
  templateSequenceId?: string | null
  currentStep: number
  status: SequenceStatus
  startedAt: string
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  userId?: string | null
  region?: string | null
  serviceType: ServiceType
  quarter: number
  year: number
  targetValue?: number | null
  targetUnits?: number | null
  currentValue: number
  currentUnits: number
  createdAt: string
  updatedAt: string
}

export interface SalesTrigger {
  id: string
  prospectId: string
  triggerType: TriggerType
  description?: string | null
  detectedAt: string
  usedInOutreach: boolean
  createdAt: string
}

export interface DealWithRelations extends Deal {
  prospect: Prospect
  contact?: Contact | null
  assignedUser?: User | null
  activities: Activity[]
}

export interface SequenceWithRelations extends Sequence {
  prospect: Prospect
  deal?: Deal | null
  templateSequence?: TemplateSequence | null
  steps: SequenceStep[]
}

export interface GoalWithProgress extends Goal {
  user?: User | null
}
