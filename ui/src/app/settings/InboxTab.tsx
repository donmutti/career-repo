import {useEffect, useState} from 'react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {Plus, X} from 'lucide-react'
import {settings, InboxSettings} from '@/services/client'
import {queryKeys} from '@/services/queryKeys'
import {queryClient} from '@/services/queryClient'
import {Spinner} from '@/shared/controls/Spinner'
import {DateLabel} from '@/shared/controls/DateLabel'

export function InboxTab() {
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.settingsInbox,
    queryFn: settings.inbox.get,
  })

  const update = useMutation({
    mutationFn: settings.inbox.update,
    onSuccess: next => queryClient.setQueryData<InboxSettings>(queryKeys.settingsInbox, next),
  })

  const [scanDays, setScanDays] = useState<number>(0)
  const [scanBatchSize, setScanBatchSize] = useState<number>(0)
  const [newKeyword, setNewKeyword] = useState('')

  useEffect(() => {
    if (data) {
      setScanDays(data.scan_days)
      setScanBatchSize(data.scan_batch_size)
    }
  }, [data])

  if (isLoading || !data) return (
    <div className="flex items-center justify-center gap-2 p-6 text-sm text-label-medium">
      <Spinner/>
      Loading inbox settings…
    </div>
  )

  const gmail = data.gmail
  const isGmailConnected = gmail.connected === true
  const gmailLabel =
    gmail.connected === true ? 'Connected' :
    gmail.connected === false ? 'Not connected' :
    'Unknown'

  const commitDays = () => {
    if (scanDays > 0 && scanDays !== data.scan_days) update.mutate({scan_days: scanDays})
  }
  const commitBatch = () => {
    if (scanBatchSize > 0 && scanBatchSize !== data.scan_batch_size) update.mutate({scan_batch_size: scanBatchSize})
  }

  const addKeyword = () => {
    const k = newKeyword.trim()
    if (!k || data.scan_keywords.includes(k)) return
    update.mutate({scan_keywords: [k, ...data.scan_keywords]})
    setNewKeyword('')
  }
  const removeKeyword = (k: string) => {
    update.mutate({scan_keywords: data.scan_keywords.filter(x => x !== k)})
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <InlineRow label="GMail MCP">
          <span className={`inline-flex items-center gap-2 ${isGmailConnected ? 'text-intent-success' : 'text-label-medium'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isGmailConnected ? 'bg-intent-success' : 'bg-frame-medium'}`}/>
            {gmailLabel}
          </span>
        </InlineRow>
      </div>

      {gmail.last_scan_at && (
        <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
          <InlineRow label="Last scanned">
            <DateLabel date={gmail.last_scan_at}/>
          </InlineRow>
        </div>
      )}

      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <InlineRow label="Scan days">
          <input
            type="number"
            min={1}
            value={scanDays}
            onChange={e => setScanDays(Number(e.target.value))}
            onBlur={commitDays}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="w-[120px] text-right"
          />
        </InlineRow>

        <InlineRow label="Scan batch size">
          <input
            type="number"
            min={1}
            value={scanBatchSize}
            onChange={e => setScanBatchSize(Number(e.target.value))}
            onBlur={commitBatch}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="w-[120px] text-right"
          />
        </InlineRow>
      </div>

      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <StackedRow label="Scan keywords">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add keyword…"
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
              className="flex-1"
            />
            <button className="secondary inline-flex items-center gap-1" onClick={addKeyword} disabled={!newKeyword.trim()}>
              <Plus size={14}/> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.scan_keywords.map(k => (
              <span key={k} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-panel-lighter border border-frame-lighter text-label-darker">
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  className="hoverable hoverable-text rounded p-0.5"
                  aria-label={`Remove ${k}`}
                >
                  <X size={12}/>
                </button>
              </span>
            ))}
          </div>
        </StackedRow>
      </div>
    </div>
  )
}

function InlineRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between min-h-[32px]">
      <span className="text-label-darker">{label}</span>
      {children}
    </div>
  )
}

function StackedRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-darker">{label}</span>
      {children}
    </div>
  )
}
