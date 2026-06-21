export interface InboxEmailOpportunity {
  id: string
  inbox_email_id: string
  title: string
  type: string
  url?: string | null
  organization_name?: string | null
  location?: string | null
  status: string  // pending | extracted | skipped
  opportunity_id?: string | null
  reason?: string | null
}

export interface DeclineReason {
  id: string
  text: string
  count: number
}
