import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {Check, Clipboard, Minus, Plus, RefreshCw} from 'lucide-react'
import {BaseDialog} from './BaseDialog'
import {TextEdit} from '@/shared/controls/edits/TextEdit'

interface ScoreExplanation {
  pros: string[]
  cons: string[]
}

function parseExplanation(raw: string): ScoreExplanation | null {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.pros) && Array.isArray(parsed.cons)) return parsed
  } catch {}
  return null
}

interface ScoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  score: number | null | undefined
  explanation: string | null | undefined
  title?: string | null
  organizationName?: string | null
  url?: string | null
  onRescore?: () => void
}

function buildClipboardText(score: number | null | undefined, structured: ScoreExplanation | null, explanation: string | null | undefined, title?: string | null, organizationName?: string | null, url?: string | null): string {
  const lines: string[] = []
  if (title || organizationName) lines.push([title, organizationName].filter(Boolean).join(' @ '))
  if (url) lines.push(url)
  if (score != null) { lines.push(''); lines.push(`Score: ${score.toFixed(1)}/10`) }
  if (lines.length) lines.push('')
  if (structured) {
    const pros = structured.pros.map(p => `+ ${p}`).join('\n')
    const cons = structured.cons.map(c => `- ${c}`).join('\n')
    lines.push(`Pros\n${pros}\n\nCons\n${cons}`)
  } else if (explanation) {
    lines.push(explanation)
  }
  return lines.join('\n')
}

export function ScoreDialog({open, onOpenChange, score, explanation, title, organizationName, url, onRescore}: ScoreDialogProps) {
  const [copied, setCopied] = useState(false)
  const dialogTitle = score != null ? `Score: ${score.toFixed(1)}/10` : 'Score'
  const structured = explanation ? parseExplanation(explanation) : null

  function copyToClipboard() {
    navigator.clipboard.writeText(buildClipboardText(score, structured, explanation, title, organizationName, url))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <BaseDialog open={open} onOpenChange={onOpenChange} title={dialogTitle} width="w-[580px]">
      <div className="flex flex-col gap-4 py-4">
        <Dialog.Description asChild className="overflow-y-auto px-5 max-h-[calc(75vh-6rem)]">
          {structured ? (
            <div className="flex flex-col gap-4 px-8 py-4 leading-relaxed">
              <div>
                <div className="text-xs font-semibold text-label-medium uppercase tracking-wide mb-2">Pros</div>
                <ul className="flex flex-col gap-1">
                  {structured.pros.map((p, i) => <li key={i} className="flex gap-2 items-start"><Plus size={14} strokeWidth={3} className="shrink-0 text-score-b mt-0.5"/>{p}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-label-medium uppercase tracking-wide mb-2">Cons</div>
                <ul className="flex flex-col gap-1">
                  {structured.cons.map((c, i) => <li key={i} className="flex gap-2 items-start"><Minus size={14} strokeWidth={3} className="shrink-0 text-score-d mt-0.5"/>{c}</li>)}
                </ul>
              </div>
            </div>
          ) : (
            <TextEdit
              value={explanation ?? 'Re-score this opportunity to see a score explanation.'}
              readOnly
              noHover
              onSubmit={() => {}}
            />
          )}
        </Dialog.Description>
        <div className="flex justify-between items-center px-5">
          {(explanation && structured) && (
            <button className="secondary flex items-center gap-1.5" onClick={copyToClipboard}>
              {copied ? <Check size={14}/> : <Clipboard size={14}/>}
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          )}
          {onRescore && (!explanation || !structured) && (
            <button className="secondary flex items-center gap-1.5" onClick={() => { onRescore(); onOpenChange(false) }}><RefreshCw size={14}/>Re-score</button>
          )}
          <button className="primary" autoFocus onClick={() => onOpenChange(false)}>OK</button>
        </div>
      </div>
    </BaseDialog>
  )
}
