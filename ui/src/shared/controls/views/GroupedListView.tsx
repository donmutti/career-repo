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
  showGroupDividers?: boolean
}

export function GroupedListView<T>({groups, row, hideEmptyGroups, showGroupDividers}: GroupedListViewProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter(g => g.defaultCollapsed).map(g => [g.key, true]))
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
              collapsible={isCollapsible}
              isCollapsed={isCollapsed}
              onToggle={() => setCollapsed(prev => ({...prev, [group.key]: !isCollapsed}))}
              onExpand={() => setCollapsed(prev => ({...prev, [group.key]: false}))}
            >
              <ListView
                items={group.items}
                renderItem={(item) => row(item)}
              />
            </GroupView>
          </div>
        )
      })}
    </div>
  )
}
