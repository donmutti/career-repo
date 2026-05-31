import {useState} from 'react'
import {useNavigate, useParams} from 'react-router'
import {Briefcase, LayoutList, MoreVertical, Plus} from 'lucide-react'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {ApiOpportunity, JOB_GROUP_BY_OPTIONS, JobGroupByMode, STATUS_LABELS} from '@/app/opportunities/OpportunityTypes'
import {Spinner} from '@/shared/controls/Spinner'
import {Pane, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {GroupedListView} from '@/shared/controls/views/GroupedListView'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {ValueDialog} from '@/shared/controls/dialogs/ValueDialog'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {JobRow} from './JobRow'
import {JobView} from './JobView'
import {AddJobBar} from './AddJobBar'
import {useOpportunities} from '@/app/opportunities/useOpportunities'
import {ApiError, opportunities as opApi} from '@/services/client'
import {toastInfo} from '@/shared/utils/ToastUtils'



export default function JobListPage() {
  const {id: selectedId} = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [newOppOpen, setNewOppOpen] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [listWidth, setListWidth] = useState(() => LocalStorageUtils.get('pane.opportunities.list', 550))
  const [groupByMode, setGroupByMode] = useState<JobGroupByMode>(() => LocalStorageUtils.get('pane.jobs.groupBy', 'status'))

  const {opportunities, isLoading, createMutation} = useOpportunities()

  const jobs = opportunities.filter(o => o.type === 'job')

  const byStatus = jobs.reduce<Record<string, ApiOpportunity[]>>((acc, o) => {
    ;(acc[o.active_version.status] ??= []).push(o)
    return acc
  }, {})

  const newJobs = byStatus['opened'] ?? []
  const groups = [
    {key: 'opened', label: 'New', count: newJobs.length, items: newJobs},
    {key: 'started', label: STATUS_LABELS.started, count: (byStatus['started'] ?? []).length, items: byStatus['started'] ?? []},
    {key: 'completed', label: STATUS_LABELS.completed, count: (byStatus['completed'] ?? []).length, items: byStatus['completed'] ?? []},
    {key: 'closed', label: STATUS_LABELS.closed, count: (byStatus['closed'] ?? []).length, items: byStatus['closed'] ?? [], defaultCollapsed: true},
  ]

  function handleCreate() {
    if (!newUrl.trim()) return
    createMutation.mutate(newUrl, {
      onSuccess: (data: unknown) => {
        setNewUrl('')
        setNewOppOpen(false)
        const id = (data as { id?: string })?.id
        if (id) {
          navigate(`/opportunities/jobs/${id}`)
          opApi.source(id)
        }
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 409) {
          const id = (error.details as { id?: string })?.id
          if (id) {
            setNewUrl('')
            setNewOppOpen(false)
            navigate(`/opportunities/jobs/${id}`)
            toastInfo('Already in your list')
          }
        }
      },
    })
  }

  return (
    <>
      {/* List pane */}
      <div className="flex flex-col overflow-hidden shrink-0 min-w-[240px]" style={{width: listWidth}}>
        <PaneHeader
          title="Jobs"
          actions={
            <div className="flex items-center gap-1">
              <IconButton icon={Plus} label="Add job opportunity" onClick={() => setNewOppOpen(true)}/>
              <DropdownButton
                trigger={<IconButton icon={MoreVertical} label="More options"/>}
                items={[
                  {label: 'Group by', header: true},
                  ...(Object.entries(JOB_GROUP_BY_OPTIONS) as [JobGroupByMode, typeof JOB_GROUP_BY_OPTIONS[JobGroupByMode]][]).map(([mode, opt]) => ({
                    label: opt.label,
                    onClick: () => { setGroupByMode(mode); LocalStorageUtils.set('pane.jobs.groupBy', mode) },
                    checked: groupByMode === mode,
                  })),
                ]}
                align="end"
              />
            </div>
          }
        />
        <AddJobBar/>
        <PaneBody>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Spinner/>
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No job opportunities"
              description="Click the + icon to add"
              className="flex flex-col items-center gap-2 p-8 text-center text-label-light pt-[250px]"
            />
          ) : (
            <>
              <GroupedListView
                groups={groups}
                showGroupDividers
                {...JOB_GROUP_BY_OPTIONS[groupByMode]}
                row={(item) => (
                  <JobRow
                    key={item.id}
                    opportunity={item}
                    navigateTo={`/opportunities/jobs/${item.id}`}
                    selected={item.id === selectedId}
                    isChanging={item.sourcing_started_at != null && item.sourcing_completed_at == null}
                  />
                )}
              />
              <div className="h-32 shrink-0"/>
            </>
          )}
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setListWidth(w => {
        const n = Math.max(240, w + d)
        LocalStorageUtils.set('pane.opportunities.list', n)
        return n
      })}/>

      {/* Detail pane */}
      <Pane>
        {selectedId ? (
          <JobView
            key={selectedId}
            opportunityId={selectedId}
          />
        ) : (
          <EmptyState
            icon={LayoutList}
            title="Select a job"
            description="Choose a job from the list to view details."
          />
        )}
      </Pane>
      {/* New opportunity dialog */}
      <ValueDialog
        open={newOppOpen}
        onOpenChange={setNewOppOpen}
        title="Add job opportunity"
        onSubmit={handleCreate}
        submitLabel="Add"
        isSubmitting={createMutation.isPending}
      >
        <div className="flex flex-col gap-1.5">
          <label>URL</label>
          <input
            autoFocus
            type="url"
            placeholder="https://company.com/jobs/..."
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full"
          />
        </div>
      </ValueDialog>
    </>
  )
}
