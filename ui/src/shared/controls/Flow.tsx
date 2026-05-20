import {LucideIcon} from 'lucide-react'

export interface FlowStep {
  key: string
  label: string
  icon?: LucideIcon
}

interface FlowProps {
  steps: FlowStep[]
  value: string
  onChange: (key: string) => void
  direction?: 'horizontal' | 'vertical'
  disabled?: boolean
}

export function Flow({steps, value, onChange, direction = 'horizontal', disabled}: FlowProps) {
  return (
    <div className={`flex ${direction === 'vertical' ? 'flex-col' : 'flex-row items-center'}`}>
      {steps.map((step, i) => {
        const isActive = step.key === value
        const Icon = step.icon

        return (
          <div key={step.key} className={`flex ${direction === 'vertical' ? 'flex-col items-start' : 'flex-row items-center'}`}>
            <button
              disabled={disabled}
              onClick={() => onChange(step.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-action text-action-text'
                  : 'text-label-dark hoverable hoverable-text'
                }
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              {Icon && <Icon size={13} className="shrink-0"/>}
              <span className="one-liner">{step.label}</span>
            </button>

            {i < steps.length - 1 && (
              <span className={`shrink-0 text-label-medium ${direction === 'vertical' ? 'ml-3 my-0.5 text-xs' : 'mx-1 text-xs'}`}>
                ›
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
