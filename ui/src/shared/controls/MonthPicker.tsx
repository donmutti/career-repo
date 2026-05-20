import {CSSProperties, useState} from 'react'
import {DayPicker} from 'react-day-picker'
import * as Popover from '@radix-ui/react-popover'
import 'react-day-picker/src/style.css'

interface MonthPickerProps {
  value?: string        // YYYY-MM
  onChange: (value: string | undefined) => void
  placeholder?: string
}

function parseMonth(s?: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + '-01T00:00:00')
  return isNaN(d.getTime()) ? undefined : d
}

function formatDisplay(d?: Date): string {
  if (!d) return ''
  return d.toLocaleDateString(undefined, {year: 'numeric', month: 'short'})
}

export function MonthPicker({value, onChange, placeholder = 'Pick a month'}: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseMonth(value)

  function handleSelect(day: Date | undefined) {
    if (!day) {
      onChange(undefined)
    } else {
      const yyyy = day.getFullYear()
      const mm = String(day.getMonth() + 1).padStart(2, '0')
      onChange(`${yyyy}-${mm}`)
    }
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`w-full text-left px-2 py-1 hoverable ${selected ? 'text-label-darker' : 'text-label-medium'}`}
        >
          {selected ? formatDisplay(selected) : placeholder}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[200] rounded-lg border border-frame-lighter bg-panel-white shadow-lg p-2"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            weekStartsOn={1}
            captionLayout="dropdown"
            hideWeekdays
            startMonth={new Date(1980, 0)}
            endMonth={new Date(new Date().getFullYear() + 5, 11)}
            style={{
              '--rdp-accent-color': 'var(--color-action)',
              '--rdp-accent-background-color': 'color-mix(in srgb, var(--color-action) 12%, transparent)',
              '--rdp-today-color': 'var(--color-action)',
              '--rdp-day-height': '34px',
              '--rdp-day-width': '34px',
              '--rdp-day_button-height': '32px',
              '--rdp-day_button-width': '32px',
              '--rdp-nav_button-height': '1.75rem',
              '--rdp-nav_button-width': '1.75rem',
              '--rdp-nav-height': '2.25rem',
            } as CSSProperties}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
