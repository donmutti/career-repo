import {useCallback, useEffect, useRef, useState} from 'react'

export interface StreamEvent {
  phase: string
  level: 'info' | 'error' | 'success'
  line: string
}

export type StreamStatus = 'idle' | 'streaming' | 'success' | 'error'

interface UseEventStreamReturn {
  events: StreamEvent[]
  status: StreamStatus
  start: () => void
  cancel: () => void
}

interface UseEventStreamOptions {
  method?: 'GET' | 'POST'
  body?: BodyInit
}

export function useEventStream(url: string, options: UseEventStreamOptions = {}): UseEventStreamReturn {
  const {method = 'POST', body} = options

  const [events, setEvents] = useState<StreamEvent[]>([])
  const [status, setStatus] = useState<StreamStatus>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(() => {
    cancel()
    setEvents([])
    setStatus('streaming')

    const ctrl = new AbortController()
    abortRef.current = ctrl

    void (async () => {
      try {
        const res = await fetch(url, {method, body, signal: ctrl.signal})
        if (!res.ok || !res.body) {
          setEvents(prev => [...prev, {phase: 'http', level: 'error', line: `HTTP ${res.status}`}])
          setStatus('error')
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let terminal: 'success' | 'error' | null = null

        while (true) {
          const {value, done} = await reader.read()
          if (done) break
          buffer += decoder.decode(value, {stream: true})

          // SSE frames are separated by blank lines.
          let frameEnd: number
          while ((frameEnd = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, frameEnd)
            buffer = buffer.slice(frameEnd + 2)
            const dataLine = frame.split('\n').find(l => l.startsWith('data: '))
            if (!dataLine) continue
            try {
              const evt = JSON.parse(dataLine.slice(6)) as StreamEvent
              if (evt.phase === 'done') {
                terminal = evt.level === 'success' ? 'success' : 'error'
              } else {
                setEvents(prev => [...prev, evt])
              }
            } catch {
              // ignore malformed frames
            }
          }
        }

        setStatus(terminal ?? 'error')
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatus('idle')
          return
        }
        setEvents(prev => [...prev, {phase: 'network', level: 'error', line: (err as Error).message}])
        setStatus('error')
      }
    })()
  }, [url, method, body, cancel])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return {events, status, start, cancel}
}
