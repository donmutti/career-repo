import {useState} from 'react'
import {TextEdit} from '@/shared/controls/edits/TextEdit'
import {CommentMenu} from '@/app/opportunities/CommentMenu'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {formatTimestamp} from '@/shared/utils/FormatUtils'

interface Comment {
  id: string
  created_at: string
  active_version: {
    body: string
    active_from: string
  }
}

interface CommentRowProps {
  comment?: Comment
  placeholder?: string
  onSave: (body: string) => void
  onUpdate?: (body: string) => void
  onDelete?: () => void
  onCancel?: () => void
}

export function CommentRow({comment, placeholder = 'Add a note…', onSave, onUpdate, onDelete, onCancel}: CommentRowProps) {
  const body = comment?.active_version.body
  const createdAt = comment?.created_at
  const activeFrom = comment?.active_version.active_from
  const parseUtc = (s: string) => new Date(/[Z+]/.test(s) ? s : s + 'Z')
  const isUpdated = createdAt && activeFrom && Math.abs(parseUtc(activeFrom).getTime() - parseUtc(createdAt).getTime()) > 1000
  const header = createdAt
    ? isUpdated
      ? `${formatTimestamp(createdAt)} (edited ${formatTimestamp(activeFrom!)})`
      : formatTimestamp(createdAt)
    : undefined
  const [editing, setEditing] = useState(() => !!onCancel)
  const [commentEditing, setCommentEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Existing note row
  if (body) {
    return (
      <div className={`relative group rounded-md ${commentEditing ? '' : 'hoverable'}`}>
        <TextEdit
          value={body}
          header={header}
          onSubmit={(v) => onUpdate ? onUpdate(v) : onSave(v)}
          doubleClickToEdit
          noHover
          editing={commentEditing}
          onEditingChange={setCommentEditing}
        />
        {onDelete && !commentEditing && (
          <div className="absolute top-2 right-2 invisible group-hover:visible has-[[data-state=open]]:visible">
            <CommentMenu
              onEdit={() => setCommentEditing(true)}
              onDelete={() => setConfirmDelete(true)}
            />
          </div>
        )}
        {onDelete && (
          <ConfirmationDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Delete note"
            body="Are you sure you want to delete this note? This cannot be undone."
            primaryActionLabel="Delete"
            severity="danger"
            onConfirm={() => { setConfirmDelete(false); onDelete() }}
          />
        )}
      </div>
    )
  }

  // New note row
  if (editing) {
    return (
      <TextEdit
        value=""
        placeholder={placeholder}
        onSubmit={(v) => {
          onSave(v)
          setEditing(false)
        }}
        onCancel={() => {
          setEditing(false)
          onCancel?.()
        }}
        allowEmpty={false}
        editing={true}
        onEditingChange={(v) => { if (!v) { setEditing(false); onCancel?.() } }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left text-label-light hoverable px-3 py-2.5 border-2 border-transparent"
    >
      {placeholder}
    </button>
  )
}
