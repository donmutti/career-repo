import {useState} from 'react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {ChevronDown, ChevronRight, ExternalLink} from 'lucide-react'
import {queryKeys} from '@/services/queryKeys'
import {inbox as inboxApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {Spinner} from '@/shared/controls/Spinner'
import {TextEdit} from '@/shared/controls/edits/TextEdit'
import {ShowMoreView} from '@/shared/controls/views/ShowMoreView'
import {InboxEmailOpportunityRow} from './InboxEmailOpportunityRow'
import {DateLabel} from '@/shared/controls/DateLabel'
import {toastInfo} from '@/shared/utils/ToastUtils'
import {OPP_TYPE_SINGULAR} from '@/app/opportunities/OpportunityTypes'
import {InboxEmailOpportunity} from '@/app/inbox/InboxTypes'

interface InboxEmail {
  id: string
  external_id: string
  subject: string
  from_address: string
  to_address: string
  received_at: string
  body: string
}

interface InboxEmailViewProps {
  emailId: string
}

export function InboxEmailView({emailId}: InboxEmailViewProps) {
  const [bodyExpanded, setBodyExpanded] = useState(true)
  const [oppsExpanded, setOppsExpanded] = useState<Record<string, boolean>>({
    job: true, project: true, education: true, networking: true, learning: true
  })
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.inboxEmail(emailId),
    queryFn: () => inboxApi.get(emailId),
  })
  const email = data as InboxEmail | undefined

  const {data: oppsData} = useQuery({
    queryKey: queryKeys.inboxEmailOpportunities(emailId),
    queryFn: () => inboxApi.emailOpportunities(emailId),
  })
  const opps = (oppsData as InboxEmailOpportunity[] | undefined) ?? []

  const extractMutation = useMutation({
    mutationFn: () => inboxApi.extractOpportunities(emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
    },
  })

  const patchOppMutation = useMutation({
    mutationFn: ({id, status}: { id: string; status: string }) =>
      inboxApi.patchEmailOpportunity(id, {status}),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({queryKey: queryKeys.inboxEmailOpportunities(emailId)})
      queryClient.invalidateQueries({queryKey: queryKeys.inboxSortedCounts})
      queryClient.invalidateQueries({queryKey: queryKeys.inboxCounts})
      if (variables.status === 'extracted' || variables.status === 'pending') {
        queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      }
      if (variables.status === 'extracted') {
        toastInfo('Job opportunity saved.')
      }
      if (variables.status === 'skipped') {
        toastInfo('Job opportunity declined.')
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner/>
      </div>
    )
  }

  if (!email) return null

  // Group opportunities by type
  const byType = opps.reduce<Record<string, InboxEmailOpportunity[]>>((acc, o) => {
    ;(acc[o.type] ??= []).push(o)
    return acc
  }, {})
  const groups = Object.entries(byType).map(([type, items]) => {
    const singular = OPP_TYPE_SINGULAR[type] ?? type
    return {
      key: type,
      label: singular.charAt(0).toUpperCase() + singular.slice(1) + ' opportunities',
      count: items.length,
      items,
    }
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-5 flex flex-col">

        {/* Title header */}
        <div className="flex flex-col gap-2 px-6 pb-4 border-b border-frame-lighter pr-6">
          <h2 className="one-liner text-xl font-semibold text-label-darkest leading-snug">{email.subject}</h2>
          <div className="grid gap-x-3 gap-y-1 text-label-medium py-2" style={{gridTemplateColumns: 'auto 1fr'}}>
            <span className="one-liner text-label-darker font-medium">From:</span><span className="truncate">{email.from_address}</span>
            <span className="one-liner text-label-darker font-medium">To:</span><span className="truncate">{email.to_address}</span>
            <span className="one-liner text-label-darker font-medium">Date:</span><DateLabel date={email.received_at}/>
            <span/><a href={`https://mail.google.com/mail/u/0/#inbox/${email.external_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-intent-info text-sm">View in Gmail <ExternalLink size={12}/></a>
          </div>
        </div>

        {/* Email body */}
        <div className="border-b border-frame-lighter pl-3">
          <div className="flex flex-col items-start justify-center m-3 mr-6">
            <button
              onClick={() => setBodyExpanded(v => !v)}
              className="flex items-center w-full h-9 my-1 py-2 text-sm font-semibold text-label-medium hoverable hoverable-text rounded"
            >
              {bodyExpanded ? <ChevronDown size={12} className="shrink-0 mr-1.5"/> : <ChevronRight size={12} className="shrink-0 mr-1.5"/>}
              Email
            </button>
            {bodyExpanded && (
              <div className="w-full pb-3">
                <ShowMoreView>
                  <TextEdit
                    value={email.body}
                    onSubmit={() => {}}
                    readOnly
                  />
                </ShowMoreView>
              </div>
            )}
          </div>
        </div>

        {/* Opportunities */}
        <div className="border-b border-frame-lighter px-3">
          <div className="flex flex-col items-start justify-center m-3">
            {groups.map(group => {
              const expanded = oppsExpanded[group.key]
              const groupCount = group.items.length
              const groupSorted = group.items.filter(o => o.status !== 'pending').length
              return (
                <div key={group.key} className="flex flex-col w-full gap-y-5">
                  <button
                    onClick={() => setOppsExpanded(v => ({...v, [group.key]: !expanded}))}
                    className="flex items-center w-full h-9 my-1 py-2 text-sm font-semibold text-label-medium hoverable hoverable-text rounded"
                  >
                    {expanded ? <ChevronDown size={12} className="shrink-0 mr-1.5"/> : <ChevronRight size={12} className="shrink-0 mr-1.5"/>}
                    <span className="truncate">{group.label} <span className="font-normal">({groupCount})</span></span>
                    {groupSorted < groupCount && <span className="attention-dot ml-1.5"/>}
                  </button>
                  {expanded && group.items.map(item => (
                    <InboxEmailOpportunityRow
                      key={item.id}
                      item={item}
                      onExtract={(id) => patchOppMutation.mutate({id, status: 'extracted'})}
                      onSkip={(id) => patchOppMutation.mutate({id, status: 'skipped'})}
                      onReset={(id) => patchOppMutation.mutate({id, status: 'pending'})}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
