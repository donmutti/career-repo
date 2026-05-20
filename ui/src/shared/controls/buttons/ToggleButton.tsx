import * as Toggle from '@radix-ui/react-toggle'
import {LucideIcon} from 'lucide-react'

interface ToggleButtonProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  icon: LucideIcon
  activeIcon?: LucideIcon
  label: string
}

export function ToggleButton({pressed, onPressedChange, icon: Icon, activeIcon: ActiveIcon, label}: ToggleButtonProps) {
  const DisplayIcon = pressed && ActiveIcon ? ActiveIcon : Icon
  return (
    <Toggle.Root
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label={label}
      className="flex items-center justify-center w-7 h-7 rounded hoverable"
      style={{
        color: pressed ? 'var(--color-action)' : 'var(--color-label-medium)',
        backgroundColor: pressed ? 'color-mix(in srgb, var(--color-action) 10%, transparent)' : undefined,
      }}
    >
      <DisplayIcon size={16}/>
    </Toggle.Root>
  )
}
