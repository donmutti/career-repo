import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {DropdownEdit} from '@/shared/controls/edits/DropdownEdit'
import {Spinner} from '@/shared/controls/Spinner'

const CURRENCIES = [
  {value: 'EUR', label: 'EUR — Euro'},
  {value: 'USD', label: 'USD — US Dollar'},
  {value: 'GBP', label: 'GBP — British Pound'},
  {value: 'CHF', label: 'CHF — Swiss Franc'},
  {value: 'PLN', label: 'PLN — Polish Zloty'},
  {value: 'CZK', label: 'CZK — Czech Koruna'},
  {value: 'SEK', label: 'SEK — Swedish Krona'},
  {value: 'DKK', label: 'DKK — Danish Krone'},
  {value: 'NOK', label: 'NOK — Norwegian Krone'},
  {value: 'CAD', label: 'CAD — Canadian Dollar'},
  {value: 'AUD', label: 'AUD — Australian Dollar'},
  {value: 'SGD', label: 'SGD — Singapore Dollar'},
]

const PERIODS = [
  {value: 'annual', label: 'Annual'},
  {value: 'monthly', label: 'Monthly'},
  {value: 'daily', label: 'Daily'},
  {value: 'hourly', label: 'Hourly'},
  {value: 'milestone', label: 'Milestone'},
]

interface CompensationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payMin?: number | null
  payMax?: number | null
  payCurrency?: string | null
  payPeriod?: string | null
  isSubmitting?: boolean
  onSubmit: (data: {job_pay_min: number | null; job_pay_max: number | null; job_pay_currency: string | null; job_pay_period: string | null}) => void
}

export function CompensationDialog({open, onOpenChange, payMin, payMax, payCurrency, payPeriod, isSubmitting, onSubmit}: CompensationDialogProps) {
  const [min, setMin] = useState(() => payMin?.toString() ?? '')
  const [max, setMax] = useState(() => payMax?.toString() ?? '')
  const [currency, setCurrency] = useState(() => payCurrency ?? 'EUR')
  const [period, setPeriod] = useState(() => payPeriod ?? 'annual')

  function handleOpen(o: boolean) {
    if (o) {
      setMin(payMin?.toString() ?? '')
      setMax(payMax?.toString() ?? '')
      setCurrency(payCurrency ?? 'EUR')
      setPeriod(payPeriod ?? 'annual')
    }
    onOpenChange(o)
  }

  function handleSubmit() {
    const hasValues = !!(min || max)
    onSubmit({
      job_pay_min: min ? Number(min) : null,
      job_pay_max: max ? Number(max) : null,
      job_pay_currency: hasValues ? currency : null,
      job_pay_period: hasValues ? period : null,
    })
  }

  return (
    <BaseDialog open={open} onOpenChange={handleOpen} title="Compensation range" onSubmit={handleSubmit}>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label>Min</label>
            <input
              autoFocus
              type="number"
              placeholder="e.g. 90000"
              value={min}
              onChange={e => setMin(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Max</label>
            <input
              type="number"
              placeholder="e.g. 120000"
              value={max}
              onChange={e => setMax(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Currency</label>
            <DropdownEdit
              value={currency}
              options={CURRENCIES}
              onChange={setCurrency}
              filterMode="filter"
              selectOnly
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label>Period</label>
            <DropdownEdit
              value={period}
              options={PERIODS}
              onChange={setPeriod}
              filterMode="jump"
              selectOnly
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2 py-1">
          <Dialog.Close asChild>
            <button className="secondary">Cancel</button>
          </Dialog.Close>
          <button className="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Spinner/> : 'Save'}
          </button>
        </div>
      </div>
    </BaseDialog>
  )
}
