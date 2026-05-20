import {CSSProperties, useRef, useState} from 'react'

interface InlineEditProps {
  value: string
  placeholder?: string
  className?: string
  bare?: boolean
  allowEmpty?: boolean
  doubleClickToEdit?: boolean
  disabled?: boolean
  submitOnBlur?: boolean
  cancelOnBlur?: boolean
  onSubmit: (value: string) => void
  onCancel?: () => void
  onFocusChange?: (focused: boolean) => void
  readOnly?: boolean
  style?: CSSProperties
}

export function InlineEdit({value, placeholder = '…', className = '', bare, allowEmpty, doubleClickToEdit, disabled, submitOnBlur = true, cancelOnBlur, onSubmit, onCancel, onFocusChange, readOnly, style}: InlineEditProps) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const displayed = pending ?? value
  if (!editing && pending === null && draft !== value) setDraft(value)
  if (pending !== null && (value === pending || value !== draft)) setPending(null)

  function submit() {
    if (cancelledRef.current) { cancelledRef.current = false; return }
    const trimmed = draft.trim()
    if ((allowEmpty || trimmed) && trimmed !== displayed) {
      setPending(trimmed)
      onSubmit(trimmed)
    }
    setEditing(false)
  }

  function cancel() {
    cancelledRef.current = true
    setDraft(value)
    setEditing(false)
    onCancel?.()
  }

  function handleBlur() {
    setFocused(false)
    onFocusChange?.(false)
    if (cancelOnBlur) cancel()
    else if (submitOnBlur) submit()
  }

  const isReadOnly = disabled || readOnly || (doubleClickToEdit && !editing)
  const activeFocus = focused && (!doubleClickToEdit || editing)
  const borderStyle = bare ? undefined : {border: `2px solid ${activeFocus ? 'var(--color-input)' : 'transparent'}`, boxShadow: activeFocus ? 'none' : undefined, padding: '0.375rem 0.5rem'}

  return (
    <input
      type="text"
      value={draft}
      readOnly={isReadOnly}
      placeholder={placeholder}
      onChange={e => setDraft(e.target.value)}
      onFocus={() => { setFocused(true); if (!disabled && !doubleClickToEdit) setEditing(true); onFocusChange?.(true) }}
      onDoubleClick={() => { if (!disabled && doubleClickToEdit) setEditing(true) }}
      onBlur={handleBlur}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel()
          e.currentTarget.blur()
        }
      }}
      className={`bg-transparent border-0 outline-none ring-0 m-0 w-full placeholder:text-label-medium ${disabled ? 'text-label-medium hoverable' : draft ? '' : 'text-label-medium'} ${!disabled && doubleClickToEdit && !editing ? 'hoverable cursor-text' : ''} ${className}`}
      style={{...borderStyle, ...style}}
    />
  )
}
