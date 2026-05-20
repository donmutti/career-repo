import {InlineEdit} from '@/shared/controls/edits/InlineEdit'

interface ValueRowBase {
  label: string
}

interface StringValueRow extends ValueRowBase {
  type: 'string'
  value: string
  placeholder?: string
  onSubmit: (value: string) => void
  allowEmpty?: boolean
}

interface NumberValueRow extends ValueRowBase {
  type: 'number'
  value: number | null | undefined
  placeholder?: string
  onSubmit: (value: number | null) => void
}

interface BooleanValueRow extends ValueRowBase {
  type: 'boolean'
  value: boolean
  onSubmit: (value: boolean) => void
}

export type ValueRowProps = StringValueRow | NumberValueRow | BooleanValueRow

export function ValueRow(props: ValueRowProps) {
  return (
    <div className="grid items-center gap-x-6 min-h-[36px]" style={{gridTemplateColumns: '10rem 1fr'}}>
      <span className="text-sm text-label-medium">{props.label}</span>
      <div className="flex items-center">
        {props.type === 'string' && (
          <InlineEdit
            value={props.value}
            placeholder={props.placeholder ?? '—'}
            allowEmpty={props.allowEmpty}
            doubleClickToEdit
            onSubmit={props.onSubmit}
          />
        )}
        {props.type === 'number' && (
          <InlineEdit
            value={props.value != null ? String(props.value) : ''}
            placeholder={props.placeholder ?? '—'}
            allowEmpty
            doubleClickToEdit
            onSubmit={(v) => props.onSubmit(v ? Number(v) : null)}
          />
        )}
        {props.type === 'boolean' && (
          <span className="text-sm text-label-medium italic">toggle</span>
        )}
      </div>
    </div>
  )
}
