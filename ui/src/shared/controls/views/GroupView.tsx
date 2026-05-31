import {ReactNode, useState} from 'react'
import {ChevronDown, ChevronRight, LucideIcon} from 'lucide-react'
import {formatCount} from '@/shared/utils/FormatUtils'
import {IconButton} from '@/shared/controls/buttons/IconButton'

export interface GroupAction {
  icon: LucideIcon
  label: string
  onClick: () => void
  expandGroup?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}

interface GroupViewProps {
  label: ReactNode
  count?: number
  actions?: GroupAction[]
  status?: ReactNode
  collapsible?: boolean
  children: ReactNode
  // controlled mode
  isCollapsed?: boolean
  onToggle?: () => void
  onExpand?: () => void
}

export function GroupView({label, count, actions, status, collapsible, children, isCollapsed: isCollapsedProp, onToggle, onExpand}: GroupViewProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false)

  const isControlled = isCollapsedProp !== undefined
  const isCollapsible = collapsible !== false
  const isCollapsed = isControlled ? isCollapsedProp! : (collapsedInternal && isCollapsible)

  function handleToggle() {
    if (onToggle) onToggle()
    else setCollapsedInternal(v => !v)
  }

  function handleExpand() {
    if (onExpand) onExpand()
    else setCollapsedInternal(false)
  }

  return (
    <div>
      <div
        className={`flex items-center w-full h-9 my-1 py-2 text-label-medium rounded select-none ${isCollapsible ? 'cursor-pointer hoverable hoverable-text' : ''}`}
        onClick={isCollapsible ? handleToggle : undefined}
      >
        {isCollapsible && (isCollapsed
          ? <ChevronRight size={12} className="shrink-0 mr-1.5"/>
          : <ChevronDown size={12} className="shrink-0 mr-1.5"/>
        )}
        <div className="flex items-center gap-x-2">
          <span className="text-sm font-semibold truncate">{label}</span>
          {count != null && <span className="text-sm font-normal">{formatCount(count)}</span>}
        </div>
        <span className="ml-auto"/>
        {status && <span className="flex items-center gap-1.5 text-sm font-normal text-label-light mr-5">{status}</span>}
        {actions && (
          <div className="flex items-center gap-x-1 mr-1.5">
            {actions.map((action) => (
              <IconButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                size={action.size ?? 'sm'}
                disabled={action.disabled}
                onClick={e => {
                  e.stopPropagation()
                  if (action.expandGroup) handleExpand()
                  action.onClick()
                }}
              />
            ))}
          </div>
        )}
      </div>
      {!isCollapsed && children}
    </div>
  )
}
