import {useNavigate, useOutletContext, useParams} from 'react-router'
import {useQuery} from '@tanstack/react-query'
import {useState} from 'react'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {Mail} from 'lucide-react'
import {Pane, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {ListView} from '@/shared/controls/views/ListView'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {InboxEmailRow} from './InboxEmailRow'
import {InboxEmailView} from './InboxEmailView'
import {TIME_WINDOWS} from './InboxTypes'
import {inbox as inboxApi} from '@/services/client'
import {queryKeys} from '@/services/queryKeys'
import {pluralize} from '@/shared/utils/FormatUtils'
import type {InboxContext} from './InboxPage'

interface InboxEmail {
  id: string
  subject: string
  from_address: string
  received_at: string
}

function getDateRange(windowKey: string): {from_date: string; to_date: string} {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return d
  }
  switch (windowKey) {
    case 'today':     return {from_date: fmt(today), to_date: fmt(today)}
    case 'yesterday': return {from_date: fmt(daysAgo(1)), to_date: fmt(daysAgo(1))}
    case 'last7':     return {from_date: fmt(daysAgo(6)), to_date: fmt(today)}
    case 'last30':    return {from_date: fmt(daysAgo(29)), to_date: fmt(today)}
    default:          return {from_date: fmt(today), to_date: fmt(today)}
  }
}

export default function InboxListPage() {
  const {id: selectedId} = useParams<{id: string}>()
  const navigate = useNavigate()
  const {activeWindow} = useOutletContext<InboxContext>()
  const [listWidth, setListWidth] = useState(() => LocalStorageUtils.get('pane.inbox.list', 500))

  const activeLabel = TIME_WINDOWS.find(w => w.key === activeWindow)?.label ?? 'Emails'
  const dateRange = getDateRange(activeWindow)

  const {data: emailsData, isLoading} = useQuery({
    queryKey: queryKeys.inboxList(activeWindow),
    queryFn: () => inboxApi.list(dateRange),
  })
  const emails = (emailsData as InboxEmail[] | undefined) ?? []

  const {data: sortedCountsData} = useQuery({
    queryKey: queryKeys.inboxSortedCounts,
    queryFn: inboxApi.sortedCounts,
  })
  const sortedCounts = (sortedCountsData as Record<string, [number, number]> | undefined) ?? {}

  // Sorted = emails where all oppos are sorted
  const sortedEmails = emails.filter(e => {
    const c = sortedCounts[e.id]
    return c && c[0] === c[1]
  }).length
  const totalWithOppos = emails.filter(e => sortedCounts[e.id]).length

  const unsortedEmails = totalWithOppos - sortedEmails
  const headerActions = totalWithOppos > 0 ? (
    <span className="flex items-center gap-1.5 text-sm text-label-medium">
      {unsortedEmails === 0 ? `All ${totalWithOppos}/${totalWithOppos} sorted` : `${unsortedEmails} ${pluralize(unsortedEmails, 'decision', 'decisions')} to make`}
    </span>
  ) : undefined

  return (
    <>
      {/* List pane */}
      <div className="flex flex-col overflow-hidden shrink-0 px-1 min-w-[240px]" style={{width: listWidth}}>
        <PaneHeader title={activeLabel} actions={headerActions}/>
        <PaneBody>
          {emails.length === 0 && !isLoading ? (
            <EmptyState
              icon={Mail}
              title="No emails"
              description="No emails for this period."
              className="flex flex-col items-center gap-2 p-8 text-center text-label-light pt-[250px]"
            />
          ) : (
            <>
              <ListView
                items={emails}
                getItemKey={(e) => e.id}
                isLoading={isLoading}
                renderItem={(e) => {
                  const c = sortedCounts[e.id]
                  const allSorted = !!c && c[0] === c[1]
                  return (
                    <InboxEmailRow
                      email={e}
                      selected={e.id === selectedId}
                      onClick={(id) => navigate(`/inbox/${id}`)}
                      allSorted={allSorted}
                    />
                  )
                }}
              />
              <div className="h-32 shrink-0"/>
            </>
          )}
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setListWidth(w => {
        const n = Math.max(240, w + d)
        LocalStorageUtils.set('pane.inbox.list', n)
        return n
      })}/>

      {/* Detail pane */}
      <Pane>
        {selectedId ? (
          <InboxEmailView key={selectedId} emailId={selectedId}/>
        ) : (
          <EmptyState
            icon={Mail}
            title="Select an email"
            description="Choose an email to view its content."
          />
        )}
      </Pane>
    </>
  )
}
