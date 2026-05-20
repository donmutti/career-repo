import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {DatePicker} from '@/shared/controls/DatePicker'

interface WorkExperienceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRole?: string
  initialCompany?: string
  initialStartDate?: string
  initialEndDate?: string
  initialDescription?: string
  onSave: (data: {role: string; company: string; start_date?: string; end_date?: string; description?: string}) => void
  isSubmitting?: boolean
}

export function WorkExperienceDialog({open, onOpenChange, initialRole = '', initialCompany = '', initialStartDate = '', initialEndDate = '', initialDescription = '', onSave, isSubmitting}: WorkExperienceDialogProps) {
  const [role, setRole] = useState(initialRole)
  const [company, setCompany] = useState(initialCompany)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)
  const [description, setDescription] = useState(initialDescription)

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setRole(initialRole)
      setCompany(initialCompany)
      setStartDate(initialStartDate)
      setEndDate(initialEndDate)
      setDescription(initialDescription)
    }
    onOpenChange(v)
  }

  const canSave = !!role.trim() && !!company.trim()

  function handleSave() {
    if (!canSave) return
    onSave({
      role: role.trim(),
      company: company.trim(),
      start_date: startDate.trim() || undefined,
      end_date: endDate.trim() || undefined,
      description: description.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <BaseDialog open={open} onOpenChange={handleOpenChange} title="Work experience" width="w-[400px]" onSubmit={handleSave}>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label>Company</label>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" autoFocus/>
        </div>
        <div className="flex flex-col gap-1">
          <label>Role</label>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Engineer"/>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label>Start date</label>
            <DatePicker value={startDate} onChange={v => setStartDate(v ?? '')} placeholder="Start date"/>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label>End date</label>
            <DatePicker value={endDate} onChange={v => setEndDate(v ?? '')} placeholder="End date"/>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Dialog.Close asChild>
            <button className="secondary">Cancel</button>
          </Dialog.Close>
          <button className="primary" disabled={!canSave || isSubmitting} onClick={handleSave}>Save</button>
        </div>
      </div>
    </BaseDialog>
  )
}
