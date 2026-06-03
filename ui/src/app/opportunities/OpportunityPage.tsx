import {useState, useMemo} from 'react'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {OPP_TYPE_LABELS, OPP_TYPES} from '@/app/opportunities/OpportunityTypes'
import {filterByTimeWindow, TIME_WINDOWS} from '@/shared/controls/views/TimeWindowTypes'
import {Outlet, useNavigate, useMatch} from 'react-router'
import {Panes, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {ListView} from '@/shared/controls/views/ListView'
import {OpportunityTypeRow} from '@/app/opportunities/OpportunityTypeRow'
import {TimeWindowRow} from '@/shared/controls/views/TimeWindowRow'
import {useOpportunities} from './useOpportunities'

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
}

export default function OpportunityPage() {
  const navigate = useNavigate()
  const [navWidth, setNavWidth] = useState(() => LocalStorageUtils.get('pane.opportunities.filter', 200))
  const [timeWindow, setTimeWindow] = useState(() => LocalStorageUtils.get('pane.opportunities.timeWindow', 'all'))

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

  const windowCounts = useMemo(
    () => TIME_WINDOWS.reduce<Record<string, number>>((acc, w) => {
      acc[w.key] = w.key === 'all' ? opportunities.length : filterByTimeWindow(opportunities, w.key).length
      return acc
    }, {}),
    [opportunities],
  )

  const matchType = useMatch('/opportunities/:type/*')
  const activeRoute = matchType?.params.type ?? null

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
                  selected={TYPE_ROUTES[type] === activeRoute}
                  onClick={() => navigate(`/opportunities/${TYPE_ROUTES[type]}`)}
                />
              )}
            />
          </div>
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setNavWidth(w => {
        const n = Math.max(140, w + d)
        LocalStorageUtils.set('pane.opportunities.filter', n)
        return n
      })}/>

      <Outlet context={{timeWindow, setTimeWindow} satisfies OpportunityContext}/>
    </Panes>
  )
}
