import {MoreVertical, Pencil, Trash2} from 'lucide-react'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface CommentMenuProps {
  onEdit: () => void
  onDelete: () => void
}

export function CommentMenu({onEdit, onDelete}: CommentMenuProps) {
  const items = [
    {label: 'Edit', icon: <Pencil size="sm"/>, onClick: onEdit},
    {divider: true, label: '', onClick: () => {}},
    {label: 'Delete', icon: <Trash2 size="sm"/>, onClick: onDelete, danger: true},
  ]

  return (
    <DropdownButton
      trigger={<IconButton icon={MoreVertical} label="More actions" tooltip={false} size="sm"/>}
      items={items}
      align="end"
    />
  )
}
