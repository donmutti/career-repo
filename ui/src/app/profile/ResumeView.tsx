import {useState} from 'react'
import {Trash2} from 'lucide-react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {PaneBody, PaneHeader} from '@/shared/controls/panes/Panes'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'

interface Resume {
  id: string
  original_name: string
  file_name: string
  created_at: string
}

interface ResumeViewProps {
  resumeId: string
  onDeleted: () => void
}

export function ResumeView({resumeId, onDeleted}: ResumeViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {data} = useQuery({
    queryKey: queryKeys.resumes,
    queryFn: profileApi.resumes.list,
  })

  const resumes = (data as Resume[] | undefined) ?? []
  const resume = resumes.find(r => r.id === resumeId)

  const deleteMutation = useMutation({
    mutationFn: () => profileApi.resumes.delete(resumeId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.resumes})
      onDeleted()
    },
  })

  if (!resume) return null

  const fileUrl = profileApi.resumes.fileUrl(resumeId, resume.original_name)
  const isPdf = resume.file_name.endsWith('.pdf')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PaneHeader
        title={resume.original_name}
        actions={
          <IconButton icon={Trash2} label="Delete resume" danger onClick={() => setConfirmDelete(true)}/>
        }
      />
      <PaneBody>
        {isPdf ? (
          <iframe
            src={`${fileUrl}#navpanes=0`}
            className="w-full h-full border-0"
            title={resume.original_name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-label-medium">
            <span>{resume.original_name}</span>
            <a href={fileUrl} download={resume.original_name} className="primary">
              Download
            </a>
          </div>
        )}
      </PaneBody>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete resume"
        body={`Delete "${resume.original_name}"? This cannot be undone.`}
        primaryActionLabel="Delete"
        severity="danger"
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}
