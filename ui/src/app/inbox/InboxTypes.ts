export interface InboxEmailOpportunity {
  id: string
  inbox_email_id: string
  title: string
  type: string
  url?: string | null
  status: string  // pending | extracted | skipped
  opportunity_id?: string | null
}
