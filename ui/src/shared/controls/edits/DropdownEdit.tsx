import {KeyboardEvent, ReactNode, useEffect, useRef, useState} from 'react'
import * as Popover from '@radix-ui/react-popover'
import {Check, ChevronDown} from 'lucide-react'
import {IconButton} from '@/shared/controls/buttons/IconButton'

export interface DropdownEditOption {
  value: string
  label: string
  icon?: ReactNode
}

interface DropdownEditProps {
  value: string
  options: DropdownEditOption[]
  placeholder?: string
  onChange: (value: string) => void
  autoFocus?: boolean
  filterMode?: 'filter' | 'jump'
}

export function DropdownEdit({value, options, placeholder = 'Search…', onChange, autoFocus, filterMode = 'filter'}: DropdownEditProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [width, setWidth] = useState<number>()
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = filterMode === 'jump' || !query
    ? options
    : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (!open) {
      setQuery('')
      setHighlightIndex(0)
    } else {
      setQuery(selected?.label ?? '')
      const idx = options.findIndex(o => o.value === value)
      setHighlightIndex(idx >= 0 ? idx : 0)
    }
  }, [open])

  useEffect(() => {
    if (filterMode === 'jump' && query) {
      const idx = options.findIndex(o => o.label.toLowerCase().startsWith(query.toLowerCase()))
      setHighlightIndex(idx >= 0 ? idx : 0)
    } else {
      setHighlightIndex(0)
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.children[highlightIndex] as HTMLElement | undefined
    el?.scrollIntoView({block: 'nearest'})
  }, [highlightIndex, open])

  function openDropdown() {
    setWidth(anchorRef.current?.offsetWidth)
    setOpen(true)
  }

  const sharedKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      inputRef.current?.blur()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openDropdown()
      else setHighlightIndex(i => (i + 1) % filtered.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => (i - 1 + filtered.length) % filtered.length)
    }
    if (open && e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      e.stopPropagation()
      onChange(filtered[highlightIndex]?.value ?? filtered[0].value)
      setOpen(false)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div ref={anchorRef} className="relative flex items-center">
            {selected?.icon && (
              <span className="absolute left-3 pointer-events-none">{selected.icon}</span>
            )}
            <input
              ref={inputRef}
              type="text"
              autoFocus={autoFocus}
              value={open ? query : (selected?.label ?? '')}
              placeholder={placeholder}
              onChange={e => {
                setQuery(e.target.value);
                if (!open) openDropdown()
              }}
              onKeyDown={sharedKeyDown}
              className={`w-full pr-7 ${selected?.icon ? 'pl-8' : ''}`}
            />
          <IconButton
            icon={ChevronDown}
            label="Toggle dropdown"
            tooltip={false}
            tabIndex={-1}
            size="md"
            className="absolute right-1"
            iconClassName="text-frame-medium"
            onMouseDown={e => {
              e.preventDefault();
              inputRef.current?.focus();
              if (open) { setOpen(false) } else openDropdown()
            }}
          />
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          onOpenAutoFocus={e => {
            e.preventDefault()
            const el = listRef.current?.children[highlightIndex] as HTMLElement | undefined
            el?.scrollIntoView({block: 'nearest'})
          }}
          onInteractOutside={e => { if (anchorRef.current?.contains(e.target as Node)) e.preventDefault() }}
          onWheel={e => e.stopPropagation()}
          sideOffset={4}
          align="start"
          className="bg-panel-white border border-frame-lighter rounded-md p-1 z-[200] shade-md overflow-y-auto"
          style={{width: width ?? anchorRef.current?.offsetWidth, maxHeight: 240, overflowY: 'auto'}}
        >
          <div ref={listRef}>
            {filtered.length === 0
              ? <div className="px-3 py-2 text-sm text-label-medium">No results</div>
              : filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    onChange(o.value);
                    setOpen(false)
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left ${o.value === value ? 'text-action' : 'text-label-darker'} ${i === highlightIndex ? 'hovered' : 'hoverable'}`}
                >
                  {o.icon && <span className="shrink-0">{o.icon}</span>}
                  <span className="flex-1">{o.label}</span>
                  {o.value === value && <Check size={12} className="shrink-0"/>}
                </button>
              ))
            }
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
