import {ReactNode} from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayMs?: number
}

export function Tooltip({content, children, side = 'right', delayMs = 500}: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={delayMs}>
      <RadixTooltip.Trigger asChild>
        {children}
      </RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="bg-tooltip text-tooltip-text text-sm px-2 py-1 rounded shade-md z-50 select-none"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
