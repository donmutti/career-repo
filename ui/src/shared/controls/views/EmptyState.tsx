import {LucideIcon} from 'lucide-react'

interface EmptyStateAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  description?: string
  primaryButton?: EmptyStateAction
  secondaryButton?: EmptyStateAction
  className?: string
}

export function EmptyState({icon: Icon, title, description, primaryButton, secondaryButton, className}: EmptyStateProps) {
  return (
    <div className={className ?? 'flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center text-label-light'}>
      <Icon size={32} strokeWidth={1.5}/>
      {title && <p className="font-medium text-label-darker m-0">{title}</p>}
      {description && <p className="m-0 text-label-medium">{description}</p>}
      {(primaryButton || secondaryButton) && (
        <div className="flex gap-2 mt-2">
          {secondaryButton && (
            <button className="secondary" onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
          )}
          {primaryButton && (
            <button className="primary flex items-center gap-x-1.5 px-3" onClick={primaryButton.onClick}>
              {primaryButton.icon && <primaryButton.icon size={14}/>}
              <span className="one-liner">{primaryButton.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
