import {useState} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {DatePicker} from '@/shared/controls/DatePicker'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  initialDescription?: string
  initialStatus?: string
  initialStartDate?: string
  initialEndDate?: string
  onSave: (data: {name: string; description?: string; status?: string; start_date?: string; end_date?: string}) => void
  isSubmitting?: boolean
}

export function ProjectDialog({open, onOpenChange, initialName = '', initialDescription = '', initialStatus = '', initialStartDate = '', initialEndDate = '', onSave, isSubmitting}: ProjectDialogProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [status, setStatus] = useState(initialStatus)
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(initialEndDate)

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(initialName)
      setDescription(initialDescription)
      setStatus(initialStatus)
      setStartDate(initialStartDate)
      setEndDate(initialEndDate)
    }
    onOpenChange(v)
  }

  const canSave = !!name.trim()

  function handleSave() {
    if (!canSave) return
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      status: status.trim() || undefined,
      start_date: startDate.trim() || undefined,
      end_date: endDate.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <BaseDialog open={open} onOpenChange={handleOpenChange} title="Project" width="w-[400px]" onSubmit={handleSave}>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Project name" autoFocus/>
        </div>
        <div className="flex flex-col gap-1">
          <label>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description"/>
        </div>
        <div className="flex flex-col gap-1">
          <label>Status</label>
          <input type="text" value={status} onChange={e => setStatus(e.target.value)} placeholder="e.g. Completed, In progress"/>
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
