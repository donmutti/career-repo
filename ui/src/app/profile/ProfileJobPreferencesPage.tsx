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
  job_preferences?: string
  job_dealbreakers?: string
}

interface ProfileData {
  id: string
  active_version: ProfileVersion
}

export default function ProfileJobPreferencesPage() {
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
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [editingDealbreakers, setEditingDealbreakers] = useState(false)

  return (
    <Pane>
      <PaneHeader title="Job preferences"/>
      <PaneBody>
        <div className="p-5 flex flex-col gap-4 max-w-2xl">
          <div className="rounded-lg border border-frame-lighter bg-panel-white p-4">
            <GroupView
              label="Describe what you're looking for"
              collapsible={false}
              actions={[{icon: Pencil, label: 'Edit', onClick: () => setEditingPrefs(true)}]}
            >
              <TextEdit
                value={av?.job_preferences ?? ''}
                placeholder="e.g., Remote-first, EU timezone, senior IC roles in distributed systems or platform engineering."
                onSubmit={(v) => patchMutation.mutate({job_preferences: v})}
                doubleClickToEdit
                allowEmpty
                editing={editingPrefs}
                onEditingChange={setEditingPrefs}
              />
            </GroupView>
          </div>
          <div className="rounded-lg border border-frame-lighter bg-panel-white p-4">
            <GroupView
              label="Describe what you won't do"
              collapsible={false}
              actions={[{icon: Pencil, label: 'Edit', onClick: () => setEditingDealbreakers(true)}]}
            >
              <TextEdit
                value={av?.job_dealbreakers ?? ''}
                placeholder="e.g., No full-time onsite, no pure management roles, no defense or surveillance industry, no legacy enterprise stacks."
                onSubmit={(v) => patchMutation.mutate({job_dealbreakers: v})}
                doubleClickToEdit
                allowEmpty
                editing={editingDealbreakers}
                onEditingChange={setEditingDealbreakers}
              />
            </GroupView>
          </div>
        </div>
      </PaneBody>
    </Pane>
  )
}
