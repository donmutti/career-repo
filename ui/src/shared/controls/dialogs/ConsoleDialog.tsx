import {ReactNode, useEffect, useRef} from 'react'
import {Check, X} from 'lucide-react'
import {BaseDialog} from './BaseDialog'
import {Spinner} from '@/shared/controls/Spinner'
import {StreamEvent, StreamStatus} from '@/shared/utils/useEventStream'

interface ConsoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  events: StreamEvent[]
  status: StreamStatus
  footer?: ReactNode
}

export function ConsoleDialog({open, onOpenChange, title, events, status, footer}: ConsoleDialogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events])

  // Guard close while streaming (Esc / outside click cannot dismiss mid-run).
  const guardedOpenChange = (next: boolean) => {
    if (!next && status === 'streaming') return
    onOpenChange(next)
  }

  return (
    <BaseDialog open={open} onOpenChange={guardedOpenChange} title={<HeaderTitle title={title} status={status}/>} width="w-[640px]">
      <div className="flex flex-col">
        <div
          ref={scrollRef}
          className="font-mono text-sm bg-panel-black text-label-lightest p-4 h-[360px] overflow-y-auto whitespace-pre-wrap"
        >
          {events.length === 0
            ? <span className="text-label-medium">Starting…</span>
            : events.map((e, i) => (
              <div key={i} className={colorFor(e.level)}>
                {e.line}
              </div>
            ))
          }
        </div>
        {footer && <div className="px-5 py-3 border-t border-frame-lighter">{footer}</div>}
      </div>
    </BaseDialog>
  )
}

function HeaderTitle({title, status}: {title: string; status: StreamStatus}) {
  return (
    <span className="inline-flex items-center gap-2">
      {title}
      <StatusPill status={status}/>
    </span>
  )
}

function StatusPill({status}: {status: StreamStatus}) {
  if (status === 'streaming') {
    return <span className="inline-flex items-center gap-1 text-label-medium text-sm font-normal"><Spinner/></span>
  }
  if (status === 'success') {
    return <span className="inline-flex items-center gap-1 text-intent-success text-sm font-normal"><Check size={14}/> Done</span>
  }
  if (status === 'error') {
    return <span className="inline-flex items-center gap-1 text-intent-danger text-sm font-normal"><X size={14}/> Failed</span>
  }
  return null
}

function colorFor(level: StreamEvent['level']): string {
  if (level === 'error') return 'text-intent-danger'
  if (level === 'success') return 'text-intent-success'
  return 'text-label-lightest'
}
