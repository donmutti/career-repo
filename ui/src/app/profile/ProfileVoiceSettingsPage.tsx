import {useState} from 'react'
import {Pencil} from 'lucide-react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {TextEdit} from '@/shared/controls/edits/TextEdit'
import {Pane, PaneBody, PaneHeader} from '@/shared/controls/panes/Panes'
import {GroupView} from '@/shared/controls/views/GroupView'

interface ProfileVersion {
  voice_settings: string
}

interface ProfileData {
  id: string
  active_version: ProfileVersion
}

export default function ProfileVoiceSettingsPage() {
  const {data: profileData} = useQuery({
    queryKey: queryKeys.profile,
    queryFn: profileApi.get,
  })

  const patchMutation = useMutation({
    mutationFn: (data: unknown) => profileApi.patch(data),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.profile}),
  })

  const pd = profileData as ProfileData | undefined
  const av = pd?.active_version
  const [editing, setEditing] = useState(false)

  return (
    <Pane>
      <PaneHeader title="Writing style"/>
      <PaneBody>
        <div className="p-5 flex flex-col gap-4 max-w-2xl">
          <div className="rounded-lg border border-frame-lighter bg-panel-white p-4">
            <GroupView
              label="Describe your preferred writing style"
              collapsible={false}
              actions={[{icon: Pencil, label: 'Edit', onClick: () => setEditing(true)}]}
            >
              <TextEdit
                value={av?.voice_settings ?? ''}
                placeholder="e.g., Warm but professional. Concise. Avoid buzzwords. Close with 'Kind regards'."
                onSubmit={(v) => patchMutation.mutate({voice_settings: v})}
                doubleClickToEdit
                allowEmpty
                editing={editing}
                onEditingChange={setEditing}
              />
            </GroupView>
          </div>
        </div>
      </PaneBody>
    </Pane>
  )
}
