import {ReactNode, useState} from 'react'
import {GroupAction, GroupView} from './GroupView'
import {ListView} from './ListView'

interface Group<T> {
  key: string
  label: ReactNode
  count?: number
  items: T[]
  actions?: GroupAction[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

interface GroupedListViewProps<T> {
  groups: Group<T>[]
  row: (item: T) => ReactNode
  hideEmptyGroups?: boolean
  collapseEmptyGroups?: boolean
  showGroupDividers?: boolean
  groupBy?: (item: T) => string
  groupByKeys?: string[]
  groupSortKey?: (groupKey: string) => number
  groupLabelDetail?: (groupKey: string) => ReactNode
}

export function GroupedListView<T>({groups: propGroups, row, hideEmptyGroups, collapseEmptyGroups, showGroupDividers, groupBy, groupByKeys, groupSortKey, groupLabelDetail}: GroupedListViewProps<T>) {
  const groups = groupBy
    ? (() => {
        const allItems = propGroups.flatMap(g => g.items)
        const buckets: Record<string, T[]> = {}
        if (groupByKeys) {
          for (const key of groupByKeys) buckets[key] = []
        }
        for (const item of allItems) {
          const key = groupBy(item) || '(Unknown)'
          ;(buckets[key] ??= []).push(item)
        }
        return Object.entries(buckets)
          .sort(([a], [b]) => groupSortKey ? groupSortKey(a) - groupSortKey(b) : a.localeCompare(b))
          .map(([key, items]) => ({key, label: key, count: items.length, items}))
      })()
    : propGroups

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter(g => g.defaultCollapsed || (collapseEmptyGroups && g.items.length === 0)).map(g => [g.key, true]))
  )

  const visible = hideEmptyGroups ? groups.filter(g => g.items.length > 0) : groups

  return (
    <div className="mx-3">
      {visible.map((group, i) => {
        const isCollapsible = group.collapsible !== false
        const isCollapsed = (collapsed[group.key] ?? false) && isCollapsible
        return (
          <div key={group.key}>
            {showGroupDividers && i > 0 && <div className="border-t border-frame-lighter mx-3 my-2"/>}
            <GroupView
              label={group.label}
              count={group.count}
              actions={group.actions}
              status={groupLabelDetail ? groupLabelDetail(group.key) : undefined}
              collapsible={isCollapsible}
              isCollapsed={isCollapsed}
              onToggle={() => setCollapsed(prev => ({...prev, [group.key]: !isCollapsed}))}
              onExpand={() => setCollapsed(prev => ({...prev, [group.key]: false}))}
            >
              <ListView
                items={group.items}
                renderItem={(item) => row(item)}
                emptyState={<div className="px-4 py-2 text-sm text-label-light ml-1">None</div>}
              />
            </GroupView>
          </div>
        )
      })}
    </div>
  )
}
