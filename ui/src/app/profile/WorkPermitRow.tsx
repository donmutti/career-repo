import {useState} from 'react'
import {Pencil, Trash2} from 'lucide-react'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {COUNTRIES, countryFlag} from '@/shared/utils/Countries'

interface WorkPermitRowProps {
  type: string
  country: string
  description?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function WorkPermitRow({type, country, description, onEdit, onDelete}: WorkPermitRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const countryEntry = COUNTRIES.find(c => c.code === country)
  const countryName = countryEntry?.name ?? country
  const flag = countryEntry ? countryFlag(country) : null
  return (
    <div className="flex items-center gap-2 px-3 pr-2 min-h-[36px] group hoverable rounded">
      <span className="one-liner flex-1 flex items-center gap-1.5">
        {flag && <span>{flag}</span>}
        {countryName || <span className="text-label-light">No country</span>}
      </span>
      <span className="one-liner text-sm font-semibold text-label-medium shrink-0 w-[150px] uppercase">{type}</span>
      {description && <span className="text-xs text-label-light truncate max-w-[120px]">{description}</span>}
      <div className="invisible group-hover:visible flex items-center gap-2">
        {onEdit && <IconButton icon={Pencil} label="Edit" onClick={onEdit}/>}
        {onDelete && <IconButton icon={Trash2} label="Delete" onClick={() => setConfirmDelete(true)} danger/>}
      </div>
      {onDelete && (
        <ConfirmationDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete work permit"
          body="Are you sure you want to delete this work permit?"
          primaryActionLabel="Delete"
          severity="danger"
          onConfirm={() => { setConfirmDelete(false); onDelete() }}
        />
      )}
    </div>
  )
}
