import {useState, useRef, useEffect, ReactNode} from 'react'
import {ChevronDown, ChevronUp} from 'lucide-react'

interface ShowMoreViewProps {
  children: ReactNode
  collapsedHeight?: number
  forceExpanded?: boolean
}

export function ShowMoreView({children, collapsedHeight = 200, forceExpanded}: ShowMoreViewProps) {
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expanded || !!forceExpanded
  const [overflows, setOverflows] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflows(el.scrollHeight > collapsedHeight)
  }, [children, collapsedHeight])

  return (
    <div>
      <div className="relative">
        <div
          ref={ref}
          style={{maxHeight: (isExpanded || forceExpanded) ? undefined : collapsedHeight, overflow: 'hidden'}}
        >
          {children}
        </div>
        {overflows && !isExpanded && !forceExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-[var(--color-panel-white)] to-transparent pointer-events-none"/>
        )}
      </div>
      {overflows && !forceExpanded && (
        <div className="flex justify-center mt-2">
          <button
            className="auxiliary gap-1 px-2 text-sm text-label-medium hoverable hoverable-text"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            {isExpanded ? <><ChevronUp size={14}/>Show less</> : <><ChevronDown size={14}/>Show more</>}
          </button>
        </div>
      )}
    </div>
  )
}
