import {CSSProperties, useCallback, useEffect, useRef, useState} from 'react'

interface TextEditProps {
  value: string
  placeholder?: string
  header?: string
  onSubmit: (value: string) => void
  onCancel?: () => void
  allowEmpty?: boolean
  readOnly?: boolean
  disabled?: boolean
  noHover?: boolean
  doubleClickToEdit?: boolean
  alwaysEditing?: boolean
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
}

export function TextEdit({value, placeholder = '…', header, onSubmit, onCancel, allowEmpty, readOnly, disabled, noHover, doubleClickToEdit, alwaysEditing, editing: editingProp, onEditingChange}: TextEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [pending, setPending] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  const isEditingControlled = editingProp !== undefined
  const isEditing = isEditingControlled ? editingProp : editing

  function setEditingState(val: boolean) {
    if (!isEditingControlled) setEditing(val)
    onEditingChange?.(val)
  }

  useEffect(() => {
    if (pending !== null && value === pending) setPending(null)
    else if (pending === null) setDraft(value)
  }, [value])

  useEffect(() => {
    if (!isEditing) return
    const focus = () => {
      const ta = ref.current
      if (!ta) return
      if (doubleClickToEdit) {
        ta.focus({preventScroll: true})
        if (selectionRef.current) {
          ta.setSelectionRange(selectionRef.current.start, selectionRef.current.end)
          selectionRef.current = null
        }
      } else {
        ta.select()
      }
    }
    const id = setTimeout(focus, 0)
    return () => clearTimeout(id)
  }, [isEditing])

  const debouncedSubmit = useCallback((v: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!allowEmpty && !v.trim()) return
      setPending(v.trim())
      onSubmit(v.trim())
    }, 600)
  }, [onSubmit])

  function submit() {
    setEditingState(false)
    if (!allowEmpty && !draft.trim()) return
    setPending(draft.trim())
    onSubmit(draft.trim())
  }

  function cancel() {
    setDraft(value)
    setEditingState(false)
    onCancel?.()
  }

  const displayed = pending ?? value
  const isEmpty = !displayed
  const activeEditing = !disabled && (alwaysEditing || isEditing)

  return (
    <div
      className={`group flex flex-col rounded-md ${activeEditing || noHover ? '' : 'hoverable'} ${!disabled && (doubleClickToEdit || alwaysEditing) ? 'cursor-text' : ''} ${disabled ? 'text-label-medium' : ''}`}
      style={{border: `2px solid ${activeEditing && !alwaysEditing ? 'var(--color-input)' : 'transparent'}`}}
      onDoubleClick={!disabled && !isEditing && doubleClickToEdit ? (e) => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          const textNode = range.startContainer
          const preRange = range.cloneRange()
          preRange.selectNodeContents(textNode.nodeType === Node.TEXT_NODE ? textNode.parentNode! : textNode)
          preRange.setEnd(range.startContainer, range.startOffset)
          const start = preRange.toString().length
          selectionRef.current = {start, end: start + range.toString().length}
        }
        setEditingState(true)
      } : undefined}
    >
      <div className="relative flex-1 px-3 py-2.5 leading-snug min-w-0">
        {header && <div className="text-sm text-label-medium mb-1">{header}</div>}
        {activeEditing ? (
          <textarea
            ref={ref}
            rows={1}
            value={draft}
            onChange={e => {
              setDraft(e.target.value)
              if (alwaysEditing) debouncedSubmit(e.target.value)
            }}
            onKeyDown={alwaysEditing ? undefined : (e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit()
              }
              if (e.key === 'Escape') cancel()
            })}
            onBlur={alwaysEditing ? undefined : () => {
              if (draft.trim() === value.trim()) {
                cancel();
                return
              }
              submit()
            }}
            placeholder={placeholder}
            className="w-full resize-none leading-snug whitespace-pre-wrap bg-transparent border-0 outline-none ring-0 p-0 m-0 block pb-8"
            style={{fieldSizing: 'content', height: 'auto'} as CSSProperties}
          />
        ) : (
          <div className={`whitespace-pre-wrap${isEmpty ? ' text-label-light' : ''}`}>
            {displayed || placeholder}
          </div>
        )}
        {isEditing && !alwaysEditing && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <button
              className="secondary px-3 text-sm h-7"
              onMouseDown={e => { e.preventDefault(); cancel() }}
            >
              Cancel
            </button>
            <button
              className="primary px-3 text-sm h-7"
              onMouseDown={e => { e.preventDefault(); submit() }}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
