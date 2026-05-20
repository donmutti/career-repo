import {MouseEvent, ReactNode, useCallback, useRef} from 'react'
import {LucideIcon} from 'lucide-react'

export function Panes({children, className}: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-1 overflow-hidden h-full${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

interface PaneProps {
  children: ReactNode
  width?: number
  minWidth?: number
}

export function Pane({children, width, minWidth = 200}: PaneProps) {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{width: width ?? 'auto', flex: width ? 'none' : 1, minWidth}}
    >
      {children}
    </div>
  )
}

interface PaneHeaderProps {
  icon?: LucideIcon
  title: string
  actions?: ReactNode
}

export function PaneHeader({icon: Icon, title, actions}: PaneHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 min-h-[57px] shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="text-label-medium shrink-0"/>}
        <span className="text-xl font-semibold text-label-darker truncate">{title}</span>
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  )
}

export function PaneBody({children}: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      {children}
    </div>
  )
}

interface PaneResizeHandleProps {
  onResize: (delta: number) => void
}

export function PaneResizeHandle({onResize}: PaneResizeHandleProps) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback((e: MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const delta = e.clientX - lastX.current
      lastX.current = e.clientX
      onResize(delta)
    }

    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }, [onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      className="shrink-0 w-[4px] cursor-col-resize -mx-[2px] z-10 relative before:absolute before:inset-y-0 before:left-[1.5px] before:w-px before:bg-frame-lighter"
    />
  )
}
