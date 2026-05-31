import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {Check} from 'lucide-react'
import {ReactElement, ReactNode} from 'react'

export interface DropdownItem {
  label?: string
  onClick?: () => void
  icon?: ReactElement
  checked?: boolean
  disabled?: boolean
  divider?: boolean
  header?: boolean
  danger?: boolean
}

interface DropdownButtonProps {
  items: DropdownItem[]
  trigger?: ReactNode
  align?: 'start' | 'end'
  className?: string
  matchWidth?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownButton({items, trigger, align = 'start', className = 'min-w-40', matchWidth, onOpenChange}: DropdownButtonProps) {
  const hasCheckmarks = items.some(item => item.checked !== undefined)
  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={4}
          align={align}
          loop
          onCloseAutoFocus={e => e.preventDefault()}
          className={`bg-panel-white border border-frame-lighter rounded-md p-1 ${className} z-[200] shade-md`}
          style={matchWidth ? {width: 'var(--radix-dropdown-menu-trigger-width)'} : undefined}
        >
          {items.map((item, i) => (
            item.divider ? (
              <DropdownMenu.Separator key={i} className="h-px bg-frame-lightest my-1"/>
            ) : item.header ? (
              <DropdownMenu.Label key={i} className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-label-medium select-none">
                {item.label}
              </DropdownMenu.Label>
            ) : (
              <DropdownMenu.Item
                key={i}
                onSelect={item.onClick}
                disabled={item.disabled}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded outline-none cursor-pointer data-[highlighted]:hovered ${item.danger ? 'text-intent-danger' : 'text-label-darker'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hoverable'}`}
              >
                {item.icon && <span className="w-3.5 shrink-0 flex items-center">
                  {item.icon}
                </span>}
                <span className="flex-1">{item.label}</span>
                {hasCheckmarks && (
                  <span className="w-3.5 shrink-0 flex justify-end">
                    {item.checked && <Check size={12} className="text-action"/>}
                  </span>
                )}
              </DropdownMenu.Item>
            )
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
