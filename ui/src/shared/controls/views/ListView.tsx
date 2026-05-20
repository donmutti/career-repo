import {ReactNode, useState} from 'react'
import {Spinner} from '@/shared/controls/Spinner'

interface ListViewProps<T> {
  items: T[]
  renderItem: (item: T, isSelected: boolean) => ReactNode
  onSelectItem?: (item: T) => void
  getItemKey?: (item: T) => string
  emptyState?: ReactNode
  isLoading?: boolean
  showItemDividers?: boolean
}

export function ListView<T>({items, renderItem, onSelectItem, getItemKey, emptyState, isLoading, showItemDividers}: ListViewProps<T>) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Spinner/>
      </div>
    )
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="flex flex-col gap-y-1 px-2">
      {items.map((item, i) => {
        const key = getItemKey ? getItemKey(item) : String(i)
        const isSelected = key === selectedKey
        return (
          <div
            key={key}
            onClick={() => {
              setSelectedKey(key)
              onSelectItem?.(item)
            }}
          >
            {showItemDividers && i > 0 && <div className="border-t border-frame-lighter"/>}
            {renderItem(item, isSelected)}
          </div>
        )
      })}
    </div>
  )
}
