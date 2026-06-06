import {useNavigate, useOutletContext, useParams} from 'react-router'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {useState} from 'react'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {Mail, MoreVertical} from 'lucide-react'
import {Pane, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {ListView} from '@/shared/controls/views/ListView'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {InboxEmailRow} from './InboxEmailRow'
import {InboxEmailView} from './InboxEmailView'
import {PENDING_WINDOW, TIME_WINDOWS, getDateRange} from '@/shared/controls/views/TimeWindowTypes'
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


export default function InboxListPage() {
  const {id: selectedId} = useParams<{id: string}>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {activeWindow} = useOutletContext<InboxContext>()
  const [listWidth, setListWidth] = useState(() => LocalStorageUtils.get('pane.inbox.list', 500))
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false)
  const [isDeclinePending, setIsDeclinePending] = useState(false)

  const activeLabel = [...TIME_WINDOWS, PENDING_WINDOW].find(w => w.key === activeWindow)?.label ?? 'Emails'
  const dateRange = getDateRange(activeWindow)
  const isPending = activeWindow === 'pending'

  const {data: emailsData, isLoading} = useQuery({
    queryKey: queryKeys.inboxList(activeWindow),
    queryFn: () => isPending ? inboxApi.listPending() : inboxApi.list(dateRange),
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
  const pendingCount = emails.reduce((sum, e) => {
    const c = sortedCounts[e.id]
    return sum + (c ? c[1] - c[0] : 0)
  }, 0)

  async function handleDeclineConfirm() {
    setIsDeclinePending(true)
    await inboxApi.declinePending(emails.map(e => e.id))
    queryClient.invalidateQueries({queryKey: queryKeys.inboxSortedCounts})
    queryClient.invalidateQueries({queryKey: queryKeys.inboxCounts})
    queryClient.invalidateQueries({queryKey: queryKeys.inboxList('pending')})
    setIsDeclinePending(false)
    setDeclineConfirmOpen(false)
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      {totalWithOppos > 0 && (
        <span className="flex items-center gap-1.5 text-sm text-label-medium">
          {unsortedEmails === 0 ? `All ${totalWithOppos} ${pluralize(totalWithOppos, 'email', 'emails')} sorted` : `${unsortedEmails} ${pluralize(unsortedEmails, 'email', 'emails')} pending decision`}
        </span>
      )}
      <DropdownButton
        trigger={<IconButton icon={MoreVertical} label="More options"/>}
        items={[
          {label: 'Decline all pending...', onClick: () => setDeclineConfirmOpen(true)},
        ]}
        align="end"
      />
    </div>
  )

  return (
    <>
      {/* List pane */}
      <div className="flex flex-col overflow-hidden shrink-0 px-1 min-w-[240px]" style={{width: listWidth}}>
        <PaneHeader title={activeLabel} actions={headerActions}/>
        <PaneBody>
          {emails.length === 0 && !isLoading ? (
            <EmptyState
              icon={Mail}
              title={activeWindow === 'pending' ? 'All clear' : 'No emails'}
              description={activeWindow === 'pending' ? 'No pending decisions.' : 'No emails for this period.'}
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

      <ConfirmationDialog
        open={declineConfirmOpen}
        onOpenChange={setDeclineConfirmOpen}
        title="Decline all pending"
        body={`Decline ${pendingCount} pending ${pluralize(pendingCount, 'opportunity', 'opportunities')} in "${activeLabel}"?`}
        primaryActionLabel="Decline all"
        severity="warning"
        onConfirm={handleDeclineConfirm}
        isSubmitting={isDeclinePending}
      />

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
