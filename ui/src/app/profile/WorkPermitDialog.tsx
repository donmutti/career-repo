import {useState} from 'react'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {CountryEdit} from '@/shared/controls/edits/CountryEdit'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import * as Dialog from '@radix-ui/react-dialog'
import {ChevronDown} from 'lucide-react'

const WORK_PERMIT_TYPES = [
  {value: 'citizenship', label: 'Citizenship'},
  {value: 'residency', label: 'Residency'},
  {value: 'visa', label: 'Visa'},
  {value: 'other', label: 'Other'},
]

interface WorkPermitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: string
  initialCountry?: string
  onSave: (type: string, country: string) => void
  isSubmitting?: boolean
}

export function WorkPermitDialog({open, onOpenChange, initialType = 'citizenship', initialCountry = '', onSave, isSubmitting}: WorkPermitDialogProps) {
  const [type, setType] = useState(initialType)
  const [country, setCountry] = useState(initialCountry)

  // Reset when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setType(initialType);
      setCountry(initialCountry)
    }
    onOpenChange(v)
  }

  const canSave = !!type && !!country

  function handleSave() {
    if (!canSave) return
    onSave(type, country)
    onOpenChange(false)
  }

  return (
    <BaseDialog open={open} onOpenChange={handleOpenChange} title="Work permit" width="w-[360px]" onSubmit={handleSave}>
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Country */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label-darker">Country</label>
          <CountryEdit
            value={country}
            onChange={setCountry}
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label-darker">Type</label>
          <DropdownButton
            matchWidth
            className="min-w-40"
            trigger={
              <button
                type="button"
                className="secondary h-10 flex items-center justify-between pr-2"
              >
                <span>{WORK_PERMIT_TYPES.find(t => t.value === type)?.label ?? 'Select type…'}</span>
                <ChevronDown size={16} className="text-label-medium shrink-0"/>
              </button>
            }
            items={WORK_PERMIT_TYPES.map(t => ({
              label: t.label,
              checked: t.value === type,
              onClick: () => setType(t.value),
            }))}
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Dialog.Close asChild>
            <button className="secondary">Cancel</button>
          </Dialog.Close>
          <button
            className="primary"
            disabled={!canSave || isSubmitting}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </BaseDialog>
  )
}
