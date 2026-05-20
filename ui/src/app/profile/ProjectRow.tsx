import {useState} from 'react'
import {MoreVertical, Pencil, Trash2} from 'lucide-react'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'

interface ProjectRowProps {
  name: string
  description?: string
  status?: string
  start_date?: string
  end_date?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function ProjectRow({name, description, status, start_date, end_date, onEdit, onDelete}: ProjectRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dateRange = start_date ? [start_date, end_date ?? 'Present'].join(' – ') : null

  const menuItems = [
    ...(onEdit ? [{label: 'Edit', icon: <Pencil size={14}/>, onClick: onEdit}] : []),
    ...(onDelete ? [
      {divider: true, label: '', onClick: () => {}},
      {label: 'Delete', icon: <Trash2 size={14}/>, onClick: () => setConfirmDelete(true), danger: true},
    ] : []),
  ]

  return (
    <div className="relative group rounded-md hoverable px-2 py-2.5">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-label-darker">{name}</span>
        {status && <span className="px-2 py-0.5 text-sm font-medium text-action rounded-full shrink-0" style={{backgroundColor: 'color-mix(in srgb, var(--color-action) 10%, transparent)'}}>{status}</span>}
        <span className="flex-1"/>
        {menuItems.length > 0 && (
          <div className="invisible group-hover:visible has-[[data-state=open]]:visible shrink-0 -mt-1" onClick={e => e.stopPropagation()}>
            <DropdownButton
              trigger={<IconButton icon={MoreVertical} label="More actions" tooltip={false} size="sm"/>}
              items={menuItems}
              align="end"
            />
          </div>
        )}
      </div>
      <div className="grid gap-x-4 mt-0.5" style={{gridTemplateColumns: '200px 1fr'}}>
        {/* Left: metadata */}
        <div className="flex flex-col">
          {dateRange && <span className="text-label-medium">{dateRange}</span>}
        </div>
        {/* Right: description */}
        <div className="min-w-0">
          {description && <span className="text-label-medium">{description}</span>}
        </div>
      </div>

      {onDelete && (
        <ConfirmationDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete project"
          body="Are you sure you want to delete this project?"
          primaryActionLabel="Delete"
          severity="danger"
          onConfirm={() => { setConfirmDelete(false); onDelete() }}
        />
      )}
    </div>
  )
}
