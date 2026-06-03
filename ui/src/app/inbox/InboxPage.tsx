import {useState} from 'react'
import {Outlet, useNavigate} from 'react-router'
import {useMutation, useQuery} from '@tanstack/react-query'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {MoreVertical, RefreshCw, X} from 'lucide-react'
import {PaneBody, PaneHeader, PaneResizeHandle, Panes} from '@/shared/controls/panes/Panes'
import {ListView} from '@/shared/controls/views/ListView'
import {TimeWindowRow} from '@/shared/controls/views/TimeWindowRow'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {TIME_WINDOWS} from '@/shared/controls/views/TimeWindowTypes'
import {inbox as inboxApi} from '@/services/client'
import {queryKeys} from '@/services/queryKeys'
import {queryClient} from '@/services/queryClient'
import {formatDuration} from '@/shared/utils/FormatUtils'
import {DateLabel} from '@/shared/controls/DateLabel'
import {Spinner} from '@/shared/controls/Spinner'
import {useInboxScan} from './useInboxScan'

export type InboxContext = {
  activeWindow: string
  setActiveWindow: (w: string) => void
}

export default function InboxPage() {
  const navigate = useNavigate()
  const [navWidth, setNavWidth] = useState(() => LocalStorageUtils.get('pane.inbox.filter', 300))
  const [activeWindow, setActiveWindow] = useState(() => LocalStorageUtils.get('inbox.window', 'today'))
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const {data: statusData} = useQuery({
    queryKey: queryKeys.inboxStatus,
    queryFn: inboxApi.status,
  })
  const lastScannedAt = (statusData as { last_scanned_at: string | null } | undefined)?.last_scanned_at

  const {data: countsData} = useQuery({
    queryKey: queryKeys.inboxCounts,
    queryFn: inboxApi.counts,
  })
  const counts = countsData as { today: number; yesterday: number; last7: number; last30: number; today_all_sorted: boolean; yesterday_all_sorted: boolean; last7_all_sorted: boolean; last30_all_sorted: boolean } | undefined

  const {scanning, elapsed, progress, start, cancel} = useInboxScan(activeWindow)

  const clearMutation = useMutation({
    mutationFn: inboxApi.clear,
    onSuccess: () => {
      setClearDialogOpen(false)
      queryClient.invalidateQueries({queryKey: ['inbox']})
      navigate('/inbox')
    },
  })

  return (
    <Panes className="bg-panel-white">
      {/* Filter pane */}
      <div className="flex flex-col overflow-hidden shrink-0 min-w-[140px]" style={{width: navWidth}}>
        <PaneHeader
          title="Inbox"
          actions={
            <div className="flex items-center gap-1.5">
              {scanning ? (
                <>
                  <Spinner className="text-label-medium"/>
                  <span className="text-sm text-label-medium truncate">
                    {!progress || progress.preparing
                      ? `Preparing scan… ${formatDuration(elapsed)}`
                      : `Scanning ${progress.current}/${progress.total} emails for ${formatDuration(elapsed)}…`
                    }
                  </span>
                  <IconButton icon={X} label="Cancel scan" danger onClick={() => cancel()}/>
                </>
              ) : (
                <>
                  {lastScannedAt && (
                    <span className="text-sm text-label-medium truncate">Scanned <DateLabel date={lastScannedAt}/></span>
                  )}
                  <IconButton icon={RefreshCw} label="Scan inbox" onClick={() => start()}/>
                  <DropdownButton
                    align="end"
                    trigger={<IconButton icon={MoreVertical} label="More" tooltip={false}/>}
                    items={[
                      {label: 'Clear scan results', danger: true, onClick: () => setClearDialogOpen(true)},
                    ]}
                  />
                </>
              )}
            </div>
          }
        />
        <PaneBody>
          <div className="py-2 px-1">
            <ListView
              items={TIME_WINDOWS}
              getItemKey={(w) => w.key}
              renderItem={(w) => (
                <TimeWindowRow
                  key={w.key}
                  label={w.label}
                  icon={w.icon}
                  selected={activeWindow === w.key}
                  onClick={() => {
                    setActiveWindow(w.key);
                    LocalStorageUtils.set('inbox.window', w.key);
                    navigate('/inbox')
                  }}
                  count={counts?.[w.key as keyof typeof counts] as number | undefined}
                  allSorted={counts?.[`${w.key}_all_sorted` as keyof typeof counts] as boolean | undefined}
                />
              )}
            />
          </div>
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setNavWidth(w => {
        const n = Math.max(140, w + d)
        LocalStorageUtils.set('pane.inbox.filter', n)
        return n
      })}/>

      <Outlet context={{activeWindow}}/>

      <ConfirmationDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title="Clear scan results"
        body="This will remove all inbox scan results and extracted opportunities. Your actual Gmail inbox is not affected."
        primaryActionLabel="Clear"
        severity="danger"
        onConfirm={() => clearMutation.mutate()}
        isSubmitting={clearMutation.isPending}
      />
    </Panes>
  )
}
