import {ReactNode} from 'react'
import {BookOpen, BriefcaseBusiness, Building2, Folder, GraduationCap, Hash, LucideIcon, Signpost, SquareUserRound, Users} from 'lucide-react'

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

export interface OpportunitySimilarity {
  id_a: string
  id_b: string
  similarity: number
  created_at: string
  updated_at: string
  title?: string | null
  organization_name?: string | null
  avatar_url?: string | null
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
  avatar_url?: string
  created_at: string
  sourcing_started_at?: string | null
  sourcing_completed_at?: string | null
  active_version: {
    title?: string
    status: string
    score?: number
    organization_name?: string
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

export type JobGroupByMode = 'status' | 'organization_name' | 'score' | 'title'

export interface JobGroupByOption {
  label: string
  icon: LucideIcon
  groupBy?: (item: ApiOpportunity) => string
  groupByKeys?: string[]
  groupSortKey?: (key: string) => number
  groupLabelDetail?: (key: string) => ReactNode
  hideEmptyGroups: boolean
  collapseEmptyGroups?: boolean
}

export function getScoreGrade(score: number | null | undefined): string {
  if (score == null) return 'Unscored'
  if (score >= 9.0) return 'Excellent'
  if (score >= 7.0) return 'Good'
  if (score >= 5.0) return 'Average'
  if (score >= 3.0) return 'Below average'
  return 'Poor'
}

export function getScoreGradeRange(grade: string): ReactNode {
  return SCORE_GRADE_RANGES[grade]
}

const SCORE_GRADE_RANGES: Record<string, string> = {
  'Excellent': '9.0 – 10.0',
  'Good': '7.0 – 8.9',
  'Average': '5.0 – 6.9',
  'Below average': '3.0 – 4.9',
  'Poor': '0.0 – 2.9',
}

const SCORE_GRADE_ORDER: Record<string, number> = {
  'Excellent': 0,
  'Good': 1,
  'Average': 2,
  'Below average': 3,
  'Poor': 4,
  'Unscored': 5,
}

export const SCORE_GRADE_KEYS = Object.keys(SCORE_GRADE_ORDER)


export const JOB_GROUP_BY_OPTIONS: Record<JobGroupByMode, JobGroupByOption> = {
  status: {
    label: 'Status',
    icon: Signpost,
    hideEmptyGroups: true,
  },
  score: {
    label: 'Score',
    icon: Hash,
    groupBy: (item) => getScoreGrade(item.active_version.score),
    groupByKeys: SCORE_GRADE_KEYS,
    groupSortKey: (grade) => SCORE_GRADE_ORDER[grade] ?? 99,
    groupLabelDetail: getScoreGradeRange,
    hideEmptyGroups: false,
    collapseEmptyGroups: true,
  },
  organization_name: {
    label: 'Company',
    icon: Building2,
    groupBy: (item) => item.active_version.organization_name ?? '(Unknown)',
    hideEmptyGroups: true,
  },
  title: {
    label: 'Title',
    icon: SquareUserRound,
    groupBy: (item) => item.active_version.title?.[0]?.toUpperCase() ?? '#',
    groupByKeys: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'],
    groupSortKey: (key) => key === '#' ? 27 : key.charCodeAt(0) - 65,
    hideEmptyGroups: true,
  },
}

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
