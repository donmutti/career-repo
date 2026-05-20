import {ButtonHTMLAttributes, forwardRef, MouseEvent} from 'react'
import {LucideIcon} from 'lucide-react'
import {Tooltip} from '@/shared/controls/Tooltip'

type ButtonSize = 'sm' | 'md'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  tooltip?: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  active?: boolean
  danger?: boolean
  disabled?: boolean
  size?: number | ButtonSize
  className?: string
  iconClassName?: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps & ButtonHTMLAttributes<HTMLButtonElement>>(
  ({icon: Icon, label, tooltip = true, onClick, active, danger, disabled, size = 'md', className = '', iconClassName = '', ...rest}, ref) => {
    const iconSize = size === 'sm' ? 16 : size === 'md' ? 18 : size as number
    const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-7 h-7' : 'w-7 h-7'
    const color = danger ? 'var(--color-intent-danger)' : active ? 'var(--color-action)' : 'var(--color-label-dark)'
    const bgColor = danger
      ? 'color-mix(in srgb, var(--color-intent-danger) 10%, transparent)'
      : active ? 'color-mix(in srgb, var(--color-action) 10%, transparent)' : undefined
    const button = (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        {...rest}
        className={`flex items-center justify-center ${sizeClass} rounded shrink-0 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hoverable cursor-pointer'} ${className}`}
        style={{
          color,
          backgroundColor: bgColor,
        }}
      >
        <Icon size={iconSize} className={iconClassName}/>
      </button>
    )

    if (!tooltip) return button

    return (
      <Tooltip content={label} side="bottom">
        {button}
      </Tooltip>
    )
  }
)
