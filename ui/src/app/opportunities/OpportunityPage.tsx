import {useState, useMemo} from 'react'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {OPP_TYPE_LABELS, OPP_TYPES, STATUS_FILTER_GROUPS, STARRED_FILTER} from '@/app/opportunities/OpportunityTypes'
import {filterByTimeWindow, TIME_WINDOWS} from '@/shared/controls/views/TimeWindowTypes'
import {Outlet, useNavigate} from 'react-router'
import {Panes, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {ListView} from '@/shared/controls/views/ListView'
import {OpportunityTypeRow} from '@/app/opportunities/OpportunityTypeRow'
import {TimeWindowRow} from '@/shared/controls/views/TimeWindowRow'
import {useOpportunities} from './useOpportunities'
import {formatCount} from '@/shared/utils/FormatUtils'

const TYPE_ROUTES: Record<string, string> = {
  job: 'jobs',
  project: 'projects',
  education: 'education',
  networking: 'networking',
  learning: 'learning',
}

export type OpportunityContext = {
  timeWindow: string
  setTimeWindow: (w: string) => void
  setActiveType: (type: string | null) => void
  statusFilter: string | null
  setStatusFilter: (s: string | null) => void
}

export default function OpportunityPage() {
  const navigate = useNavigate()
  const [navWidth, setNavWidth] = useState(() => LocalStorageUtils.get('pane.opportunities.filter', 300))
  const [timeWindow, setTimeWindow] = useState(() => LocalStorageUtils.get('pane.opportunities.timeWindow', 'all'))
  const [activeType, setActiveType] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(() => LocalStorageUtils.get('pane.opportunities.statusFilter', null))

  const {opportunities} = useOpportunities()

  const windowedOpportunities = useMemo(
    () => filterByTimeWindow(opportunities, timeWindow),
    [opportunities, timeWindow],
  )

  const typeCounts = useMemo(
    () => windowedOpportunities.reduce<Record<string, number>>((acc, o) => {
      acc[o.type] = (acc[o.type] ?? 0) + 1
      return acc
    }, {}),
    [windowedOpportunities],
  )

  const windowCounts = useMemo(() => {
    const base = activeType ? opportunities.filter(o => o.type === activeType) : opportunities
    return TIME_WINDOWS.reduce<Record<string, number>>((acc, w) => {
      acc[w.key] = w.key === 'all' ? base.length : filterByTimeWindow(base, w.key).length
      return acc
    }, {})
  }, [opportunities, activeType])

  const statusCounts = useMemo(() => {
    const base = filterByTimeWindow(activeType ? opportunities.filter(o => o.type === activeType) : opportunities, timeWindow)
    const counts: Record<string, number> = {
      archived: base.filter(o => o.active_version.closed_on != null).length,
      starred: base.filter(o => o.active_version.is_starred).length,
    }
    const nonArchived = base.filter(o => o.active_version.closed_on == null)
    for (const s of STATUS_FILTER_GROUPS) {
      if (s.key in counts) continue
      counts[s.key] = nonArchived.filter(o => o.active_version.status === s.key).length
    }
    return counts
  }, [opportunities, activeType, timeWindow])

  return (
    <Panes className="bg-panel-white">
      {/* Filter pane */}
      <div className="flex flex-col overflow-hidden shrink-0 min-w-[140px]" style={{width: navWidth}}>
        <PaneHeader title="Opportunities"/>
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
                  selected={timeWindow === w.key}
                  count={windowCounts[w.key]}
                  onClick={() => {
                    setTimeWindow(w.key)
                    LocalStorageUtils.set('pane.opportunities.timeWindow', w.key)
                  }}
                />
              )}
            />
            <div className="border-t border-frame-lighter mx-2 my-2"/>
            <ListView
              items={OPP_TYPES}
              renderItem={(type) => (
                <OpportunityTypeRow
                  key={type}
                  type={type}
                  label={OPP_TYPE_LABELS[type] ?? type}
                  count={typeCounts[type] ?? 0}
                  selected={activeType === type}
                  onClick={() => navigate(`/opportunities/${TYPE_ROUTES[type]}`)}
                />
              )}
            />
            <div className="border-t border-frame-lighter mx-2 my-2"/>
            <ListView
              items={STATUS_FILTER_GROUPS}
              getItemKey={(s) => s.key}
              renderItem={(s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    const next = statusFilter === s.key ? null : s.key
                    setStatusFilter(next)
                    LocalStorageUtils.set('pane.opportunities.statusFilter', next)
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-left ${statusFilter === s.key ? 'text-action hovered' : 'text-label-dark hoverable'}`}
                >
                  <s.icon size={16} className="shrink-0"/>
                  <span className="flex-1 text-base text-label-darker">{s.label}</span>
                  <span className="text-sm text-label-medium">{formatCount(statusCounts[s.key] ?? 0)}</span>
                </button>
              )}
            />
            <div className="border-t border-frame-lighter mx-2 my-2"/>
            <button
              onClick={() => {
                const next = statusFilter === STARRED_FILTER.key ? null : STARRED_FILTER.key
                setStatusFilter(next)
                LocalStorageUtils.set('pane.opportunities.statusFilter', next)
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left ${statusFilter === STARRED_FILTER.key ? 'text-action hovered' : 'text-label-dark hoverable'}`}
            >
              <STARRED_FILTER.icon size={16} className="shrink-0"/>
              <span className="flex-1 text-base text-label-darker">{STARRED_FILTER.label}</span>
              <span className="text-sm text-label-medium">{formatCount(statusCounts[STARRED_FILTER.key] ?? 0)}</span>
            </button>
          </div>
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setNavWidth(w => {
        const n = Math.max(140, w + d)
        LocalStorageUtils.set('pane.opportunities.filter', n)
        return n
      })}/>

      <Outlet context={{timeWindow, setTimeWindow, setActiveType, statusFilter, setStatusFilter} satisfies OpportunityContext}/>
    </Panes>
  )
}
