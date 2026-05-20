import {MoreVertical, Paperclip, Trash2} from 'lucide-react'
import {Attachment} from '@/app/opportunities/OpportunityTypes'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface AttachmentRowProps {
  attachment: Attachment
  onDelete: () => void
}

export function AttachmentRow({attachment, onDelete}: AttachmentRowProps) {
  return (
    <div className="relative group flex items-center hoverable rounded">
      <a
        href={`/api/attachments/${attachment.id}/download`}
        target="_blank"
        rel="noreferrer"
        className="flex-1 flex items-center gap-1.5 px-3 py-2 text-sm text-intent-info"
      >
        <Paperclip size={12} className="shrink-0"/>
        <span className="truncate">{attachment.title ?? attachment.file_path}</span>
      </a>
      <div className="absolute right-1 invisible group-hover:visible has-[[data-state=open]]:visible">
        <DropdownButton
          trigger={<IconButton icon={MoreVertical} label="More actions" tooltip={false} size="sm"/>}
          items={[{label: 'Delete', icon: <Trash2 size="sm"/>, onClick: onDelete, danger: true}]}
          align="end"
        />
      </div>
    </div>
  )
}
