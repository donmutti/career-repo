import {BookOpen, BriefcaseBusiness, Folder, GraduationCap, LucideIcon, Users} from 'lucide-react'

export interface OpportunityVersion {
  status: string
  title?: string
  description?: string
  score?: number
  score_explanation?: string
  organization_name?: string
  job_role?: string
  job_pay_currency?: string
  job_pay_min?: number
  job_pay_max?: number
  job_pay_period?: string
  opened_on?: string
}

export interface Opportunity {
  id: string
  type: string
  url: string
  avatar_url?: string
  sourcing_started_at?: string | null
  sourcing_completed_at?: string | null
  sourcing_agent_run_id?: string | null
  active_version: OpportunityVersion
}

export interface CommentVersion {
  body: string
  active_from: string
  active_to?: string
}

export interface Comment {
  id: string
  opportunity_id: string
  created_at: string
  active_version: CommentVersion
}

export interface Attachment {
  id: string
  type: string
  title?: string
  file_type: string
  file_path: string
}

export interface ApiOpportunity {
  id: string
  type: string
  url: string
  created_at: string
  sourcing_started_at?: string | null
  sourcing_completed_at?: string | null
  active_version: {
    title?: string
    status: string
    score?: number
  }
}

export const STATUS_COLORS: Record<string, string> = {
  opened: 'var(--color-intent-info)',
  started: 'var(--color-intent-warning)',
  completed: 'var(--color-intent-success)',
  closed: 'var(--color-label-light)',
}

export const STATUS_LABELS: Record<string, string> = {
  opened: 'New',
  started: 'In progress',
  completed: 'Completed',
  closed: 'Archived',
}

export const STATUS_GROUPS = [
  {key: 'opened', label: STATUS_LABELS.opened},
  {key: 'started', label: STATUS_LABELS.started},
  {key: 'completed', label: STATUS_LABELS.completed},
  {key: 'closed', label: STATUS_LABELS.closed},
]

export const OPP_TYPES = ['job', 'project', 'education', 'networking', 'learning']

export const OPP_TYPE_LABELS: Record<string, string> = {
  job: 'Jobs',
  project: 'Projects',
  education: 'Education',
  networking: 'Networking',
  learning: 'Learning',
}

export const OPP_TYPE_SINGULAR: Record<string, string> = {
  job: 'job',
  project: 'project',
  education: 'education',
  networking: 'networking',
  learning: 'learning',
}

export const OPP_TYPE_ICONS: Record<string, LucideIcon> = {
  job: BriefcaseBusiness,
  project: Folder,
  education: GraduationCap,
  networking: Users,
  learning: BookOpen,
}
