import {ReactNode} from 'react'
import {Archive, BookOpen, BriefcaseBusiness, Building2, CalendarDays, CheckCircle, Coins, Folder, GraduationCap, Hash, Inbox, LucideIcon, MapPin, Play, Signpost, SquareUserRound, Users} from 'lucide-react'
import {dateBucketKey, formatDateBucketKey} from '@/shared/utils/FormatUtils'

export type OpportunityType = 'job' | 'project' | 'education' | 'networking' | 'learning'
export type OpportunityStatus = 'opened' | 'started' | 'completed' | 'closed'
export type JobContractType = 'permanent' | 'fixed_term' | 'contractor'
export type JobWorkMode = 'onsite' | 'remote' | 'hybrid'
export type JobPayPeriod = 'hourly' | 'daily' | 'monthly' | 'annual' | 'milestone'
export type ProjectType = 'product' | 'service' | 'feature' | 'milestone' | 'community' | 'event' | 'other'
export type EducationType = 'degree' | 'certification' | 'course' | 'workshop' | 'other'
export type EducationLevel = 'bachelor' | 'master' | 'phd' | 'professional' | 'associate' | 'other'
export type NetworkingType = 'meet' | 'attend' | 'host'
export type LearningType = 'book' | 'article' | 'media' | 'repository' | 'study' | 'other'

export interface OpportunityVersion {
  organization_name?: string | null
  parent_id?: string | null
  status: OpportunityStatus
  title?: string | null
  description?: string | null
  location?: string | null
  score?: number | null
  score_explanation?: string | null
  started_at?: string | null
  completed_at?: string | null
  closed_at?: string | null
  close_reason?: string | null
  is_starred: boolean

  job_role?: string | null
  job_level?: string | null
  job_contract_type?: JobContractType | null
  job_work_mode?: JobWorkMode | null
  job_pay_period?: JobPayPeriod | null
  job_pay_currency?: string | null
  job_pay_min?: number | null
  job_pay_max?: number | null

  project_type?: ProjectType | null

  education_type?: EducationType | null
  education_level?: EducationLevel | null

  networking_type?: NetworkingType | null
  networking_is_online?: boolean | null
  networking_contact_info?: string | null

  learning_type?: LearningType | null
  learning_duration?: string | null
}

export interface Opportunity {
  id: string
  type: OpportunityType
  url?: string | null
  avatar_url?: string | null
  created_at: string
  sourcing_started_at?: string | null
  sourcing_completed_at?: string | null
  sourcing_agent_run_id?: string | null
  active_version: OpportunityVersion
}

export interface CommentVersion {
  body: string
  active_from: string
  active_to?: string | null
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

export type AttachmentType = 'cv' | 'motivation' | 'study' | 'portfolio' | 'other'

export interface Attachment {
  id: string
  opportunity_id: string
  type: AttachmentType
  title?: string | null
  file_path: string
  file_type: string
}

export const STATUS_LABELS: Record<string, string> = {
  opened: 'New',
  started: 'In progress',
  completed: 'Completed',
  closed: 'Archived',
}

export const STATUS_GROUPS: {key: string; label: string; icon: LucideIcon}[] = [
  {key: 'opened', label: STATUS_LABELS.opened, icon: Inbox},
  {key: 'started', label: STATUS_LABELS.started, icon: Play},
  {key: 'completed', label: STATUS_LABELS.completed, icon: CheckCircle},
  {key: 'closed', label: STATUS_LABELS.closed, icon: Archive},
]

export type JobGroupByMode = 'status' | 'organization_name' | 'location' | 'score' | 'title' | 'compensation' | 'date'

export interface JobGroupByOption {
  label: string
  icon: LucideIcon
  groupBy?: (item: Opportunity) => string
  groupByKeys?: string[]
  groupSortKey?: (key: string) => number
  groupLabel?: (key: string) => string
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


const ANNUAL_MULTIPLIERS: Record<string, number> = {
  annual: 1,
  monthly: 12,
  daily: 220,
  hourly: 1760,
  milestone: 1,
}

const COMP_BREAKPOINTS = [0, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 500]

const COMP_BUCKET_KEYS = [
  ...COMP_BREAKPOINTS.map((lo, i) => {
    const hi = COMP_BREAKPOINTS[i + 1]
    if (lo === 0 && hi != null) return `< ${hi}K`
    return hi != null ? `${lo}K – ${hi}K` : `${lo}K+`
  }),
  'Unspecified',
]

const COMP_NUMERIC_KEYS = COMP_BUCKET_KEYS.filter(k => k !== 'Unspecified')
const COMP_BUCKET_ORDER: Record<string, number> = {
  ...Object.fromEntries([...COMP_NUMERIC_KEYS].reverse().map((k, i) => [k, i])),
  'Unspecified': COMP_NUMERIC_KEYS.length - 1,
}

export function getCompensationBucket(item: Opportunity): string {
  const v = item.active_version
  const mult = ANNUAL_MULTIPLIERS[v.job_pay_period ?? ''] ?? 1
  const min = v.job_pay_min != null ? v.job_pay_min * mult : null
  const max = v.job_pay_max != null ? v.job_pay_max * mult : null
  const annual = min != null && max != null ? (min + max) / 2 : (min ?? max)
  if (annual == null) return 'Unspecified'
  const k = annual / 1000
  for (let i = COMP_BREAKPOINTS.length - 1; i >= 0; i--) {
    if (k >= COMP_BREAKPOINTS[i]) {
      const lo = COMP_BREAKPOINTS[i]
      const hi = COMP_BREAKPOINTS[i + 1]
      if (lo === 0 && hi != null) return `< ${hi}K`
      return hi != null ? `${lo}K – ${hi}K` : `${lo}K+`
    }
  }
  return '< 50K'
}

export const JOB_GROUP_BY_OPTIONS: Record<JobGroupByMode, JobGroupByOption> = {
  date: {
    label: 'Date',
    icon: CalendarDays,
    groupBy: (item) => dateBucketKey(item.created_at.slice(0, 10)),
    groupSortKey: (key) => -Number(key.replaceAll('-', '')),
    groupLabel: formatDateBucketKey,
    hideEmptyGroups: true,
  },
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
    groupBy: (item) => item.active_version.organization_name ?? '(Unspecified)',
    hideEmptyGroups: true,
  },
  location: {
    label: 'Location',
    icon: MapPin,
    groupBy: (item) => item.active_version.location ?? '(Unspecified)',
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
  compensation: {
    label: 'Compensation',
    icon: Coins,
    groupBy: getCompensationBucket,
    groupByKeys: COMP_BUCKET_KEYS,
    groupSortKey: (key) => COMP_BUCKET_ORDER[key] ?? 99,
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
