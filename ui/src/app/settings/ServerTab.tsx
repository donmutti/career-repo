import {useEffect, useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {system} from '@/services/client'
import {Spinner} from '@/shared/controls/Spinner'
import {ConsoleDialog} from '@/shared/controls/dialogs/ConsoleDialog'
import {useEventStream} from '@/shared/utils/useEventStream'
import {toastInfo} from '@/shared/utils/ToastUtils'

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 90_000

export function ServerTab() {
  const {data, isLoading, isError} = useQuery({
    queryKey: queryKeys.systemStatus,
    queryFn: system.status,
  })

  const stream = useEventStream(system.upgradeUrl(), {method: 'POST'})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [postSuccessState, setPostSuccessState] = useState<'idle' | 'waiting' | 'timeout'>('idle')

  const installed = data?.version ?? null
  const latest = data?.latest_version ?? null
  const upgradeAvailable = !!installed && !!latest && latest !== installed && isHigher(latest, installed)

  const handleUpgrade = () => {
    if (!upgradeAvailable) {
      toastInfo(`You're already on the latest version ${installed}.`)
      return
    }
    setPostSuccessState('idle')
    setDialogOpen(true)
    stream.start()
  }

  // After server reports success, wait until /system/status returns with the new version,
  // then hard reload. Stash a one-shot toast key so the next page shows confirmation.
  useEffect(() => {
    if (stream.status !== 'success' || !latest) return
    setPostSuccessState('waiting')
    const startedAt = Date.now()
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const next = await system.status()
        if (next.version === latest) {
          window.location.reload()
          return
        }
      } catch {
        // server still down — keep polling
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setPostSuccessState('timeout')
        return
      }
      setTimeout(tick, POLL_INTERVAL_MS)
    }
    setTimeout(tick, POLL_INTERVAL_MS)

    return () => { cancelled = true }
  }, [stream.status, latest])

  if (isLoading) return (
    <div className="flex items-center justify-center gap-2 p-6 text-label-medium">
      <Spinner/>
      Loading server status…
    </div>
  )

  const isConnected = !isError && !!data

  // Dialog status drives the pill; while polling we keep showing "streaming" to mean "still working".
  const dialogStatus = postSuccessState === 'waiting' ? 'streaming' : stream.status === 'idle' ? 'streaming' : stream.status

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <Row label="Status">
          <span className={`inline-flex items-center gap-2 ${isConnected ? 'text-intent-success' : 'text-label-medium'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-intent-success' : 'bg-frame-medium'}`}/>
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </Row>

        <Row label="Current version">
          <span className="text-label-darker font-medium">{installed ?? '—'}</span>
        </Row>

        <Row label="Latest version">
          <span className="text-label-darker font-medium">{latest ?? '—'}</span>
        </Row>
      </div>

      <div className="pt-2">
        <button className="primary" onClick={handleUpgrade}>
          Update to latest version
        </button>
      </div>

      <ConsoleDialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!open) {
            stream.cancel()
            setDialogOpen(false)
            setPostSuccessState('idle')
          }
        }}
        title={`Upgrade${latest ? ` to ${latest}` : ''}`}
        events={stream.events}
        status={dialogStatus}
        footer={
          postSuccessState === 'waiting'
            ? <span className="text-label-medium text-sm">Waiting for the API to come back…</span>
            : postSuccessState === 'timeout'
              ? <span className="text-intent-danger text-sm">Server did not return with the new version. Check the logs.</span>
              : null
        }
      />
    </div>
  )
}

function isHigher(a: string, b: string): boolean {
  const parse = (s: string) => s.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  const [aa, bb] = [parse(a), parse(b)]
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i] ?? 0, y = bb[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between min-h-[32px]">
      <span className="text-label-darker">{label}</span>
      {children}
    </div>
  )
}
