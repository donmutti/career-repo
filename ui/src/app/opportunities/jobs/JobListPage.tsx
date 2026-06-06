import {useEffect, useState} from 'react'
import {useNavigate, useOutletContext, useParams} from 'react-router'
import {ArrowDownUp, Briefcase, LayoutList} from 'lucide-react'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {JOB_GROUP_BY_OPTIONS, JobGroupByMode, Opportunity, STATUS_LABELS} from '@/app/opportunities/OpportunityTypes'
import {filterByTimeWindow} from '@/shared/controls/views/TimeWindowTypes'
import type {OpportunityContext} from '@/app/opportunities/OpportunityPage'
import {Spinner} from '@/shared/controls/Spinner'
import {Pane, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {GroupedListView} from '@/shared/controls/views/GroupedListView'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {JobRow} from './JobRow'
import {JobView} from './JobView'
import {AddJobBar} from './AddJobBar'
import {useOpportunities} from '@/app/opportunities/useOpportunities'
import {ScoreDialog} from '@/shared/controls/dialogs/ScoreDialog'
import {useMutation} from '@tanstack/react-query'
import {opportunities as opApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {queryKeys} from '@/services/queryKeys'


export default function JobListPage() {
  const {id: selectedId} = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [listWidth, setListWidth] = useState(() => LocalStorageUtils.get('pane.opportunities.list', 550))
  const [groupByMode, setGroupByMode] = useState<JobGroupByMode>(() => LocalStorageUtils.get('pane.jobs.groupBy', 'status'))
  const [scoreDialogOpportunity, setScoreDialogOpportunity] = useState<Opportunity | null>(null)

  const {timeWindow, setActiveType} = useOutletContext<OpportunityContext>()

  useEffect(() => {
    setActiveType('job')
    return () => setActiveType(null)
  }, [setActiveType])
  const {opportunities, isLoading} = useOpportunities()

  const rescoreMutation = useMutation({
    mutationFn: (id: string) => opApi.source(id),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.opportunities}),
  })

  const jobs = filterByTimeWindow(opportunities.filter(o => o.type === 'job'), timeWindow)

  const byStatus = jobs.reduce<Record<string, Opportunity[]>>((acc, o) => {
    ;(acc[o.active_version.status] ??= []).push(o)
    return acc
  }, {})

  // Checks if an item is new and unscored yet
  const isNewUnscored = (o: Opportunity) => o.sourcing_started_at != null && o.sourcing_completed_at == null && o.active_version.score == null

  // Groups by status, with new unscored lifted to the top for visibility
  const g = (key: string) => (byStatus[key] ?? []).slice().sort((a, b) => +isNewUnscored(b) - +isNewUnscored(a))

  // Groups scored by status
  const groups = [
    {key: 'started', label: STATUS_LABELS.started, count: g('started').length, items: g('started')},
    {key: 'shortlisted', label: STATUS_LABELS.shortlisted, count: g('shortlisted').length, items: g('shortlisted')},
    {key: 'opened', label: STATUS_LABELS.opened, count: g('opened').length, items: g('opened')},
    {key: 'completed', label: STATUS_LABELS.completed, count: g('completed').length, items: g('completed')},
    {key: 'closed', label: STATUS_LABELS.closed, count: g('closed').length, items: g('closed'), defaultCollapsed: true},
  ]

  return (
    <>
      {/* List pane */}
      <div className="flex flex-col overflow-hidden shrink-0 min-w-[240px]" style={{width: listWidth}}>
        <PaneHeader
          title="Jobs"
          actions={
            <div className="flex items-center gap-1">
              <DropdownButton
                trigger={<IconButton icon={ArrowDownUp} label="Group by"/>}
                items={[
                  {label: 'Group by', header: true},
                  ...(Object.entries(JOB_GROUP_BY_OPTIONS) as [JobGroupByMode, typeof JOB_GROUP_BY_OPTIONS[JobGroupByMode]][]).map(([mode, opt]) => ({
                    label: opt.label,
                    icon: <opt.icon size={14}/>,
                    onClick: () => {
                      setGroupByMode(mode);
                      LocalStorageUtils.set('pane.jobs.groupBy', mode)
                    },
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
                    onScoreBadgeClick={() => setScoreDialogOpportunity(item)}
                    onRescore={() => rescoreMutation.mutate(item.id)}
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
      <ScoreDialog
        open={scoreDialogOpportunity != null}
        onOpenChange={(open) => { if (!open) setScoreDialogOpportunity(null) }}
        score={scoreDialogOpportunity?.active_version.score}
        explanation={scoreDialogOpportunity?.active_version.score_explanation}
        title={scoreDialogOpportunity?.active_version.title}
        organizationName={scoreDialogOpportunity?.active_version.organization_name}
        url={scoreDialogOpportunity?.url}
      />
    </>
  )
}
