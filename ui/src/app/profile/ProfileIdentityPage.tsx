import {useState} from 'react'
import {ExternalLink, Github, Globe, Linkedin, Mail, Phone, Plus} from 'lucide-react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {InlineEdit} from '@/shared/controls/edits/InlineEdit'
import {CountryEdit} from '@/shared/controls/edits/CountryEdit'
import {Pane, PaneBody, PaneHeader} from '@/shared/controls/panes/Panes'
import {GroupView} from '@/shared/controls/views/GroupView'
import {WorkPermitRow} from './WorkPermitRow'
import {WorkPermitDialog} from './WorkPermitDialog'

interface WorkPermit {
  type: string
  country: string
  description?: string
}

interface ProfileVersion {
  full_name: string
  email?: string
  phone?: string
  github_url?: string
  linkedin_url?: string
  website_url?: string
  location?: string
  work_permits: WorkPermit[]
  active_from: string
}

interface ProfileData {
  id: string
  created_at: string
  active_version: ProfileVersion
}

export default function ProfileIdentityPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

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
  const permits = av?.work_permits ?? []

  function deletePermit(index: number) {
    const updated = permits.filter((_, i) => i !== index)
    patchMutation.mutate({work_permits: updated})
  }

  function savePermit(type: string, country: string) {
    const updated = [...permits, {type, country}]
    patchMutation.mutate({work_permits: updated})
  }

  function updatePermit(index: number, type: string, country: string) {
    const updated = permits.map((p, i) => i === index ? {type, country} : p)
    patchMutation.mutate({work_permits: updated})
  }

  const editingPermit = editIndex !== null ? permits[editIndex] : null

  return (
    <Pane>
      <PaneHeader title="About"/>
      <PaneBody>
        <div className="flex flex-col gap-4 p-5 max-w-2xl">

          {/* Full name card */}
          <div className="rounded-lg border border-frame-lighter bg-panel-white p-4">
            <GroupView label="Full name" collapsible={false}>
              <div className="pb-2">
                <InlineEdit
                  value={av?.full_name ?? ''}
                  placeholder="Your full name"
                  onSubmit={(v) => patchMutation.mutate({full_name: v})}
                  doubleClickToEdit
                  className="hoverable"
                />
              </div>
            </GroupView>
          </div>

          {/* Contact card */}
          <div className="rounded-lg border border-frame-lighter bg-panel-white p-4">
            <GroupView label="Contact & location" collapsible={false}>
              <div className="flex flex-col gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <Mail size={15} className="shrink-0 text-label-light"/>
                  <InlineEdit value={av?.email ?? ''} placeholder="Email" onSubmit={(v) => patchMutation.mutate({email: v || null})} doubleClickToEdit className="hoverable flex-1"/>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={15} className="shrink-0 text-label-light"/>
                  <InlineEdit value={av?.phone ?? ''} placeholder="Phone" onSubmit={(v) => patchMutation.mutate({phone: v || null})} doubleClickToEdit className="hoverable flex-1"/>
                </div>
                <div className="flex items-center gap-2">
                  <Linkedin size={15} className="shrink-0 text-label-light"/>
                  <InlineEdit value={av?.linkedin_url ?? ''} placeholder="LinkedIn URL" onSubmit={(v) => patchMutation.mutate({linkedin_url: v || null})} doubleClickToEdit className="hoverable flex-1"/>
                </div>
                <div className="flex items-center gap-2">
                  <Github size={15} className="shrink-0 text-label-light"/>
                  <InlineEdit value={av?.github_url ?? ''} placeholder="GitHub URL" onSubmit={(v) => patchMutation.mutate({github_url: v || null})} doubleClickToEdit className="hoverable flex-1"/>
                </div>
                <div className="flex items-center gap-2">
                  <ExternalLink size={15} className="shrink-0 text-label-light"/>
                  <InlineEdit value={av?.website_url ?? ''} placeholder="Website URL" onSubmit={(v) => patchMutation.mutate({website_url: v || null})} doubleClickToEdit className="hoverable flex-1"/>
                </div>
                <div className="flex items-center gap-2">
                  <Globe size={15} className="shrink-0 text-label-light"/>
                  <CountryEdit value={av?.location ?? ''} placeholder="Country" onChange={(v) => patchMutation.mutate({location: v || null})}/>
                </div>
              </div>
            </GroupView>
          </div>

          {/* Work permits card */}
          <div className="rounded-lg border border-frame-lighter bg-panel-white p-4">
            <GroupView
              label="Work permits"
              count={permits.length}
              collapsible={false}
              actions={[{icon: Plus, size: "md", label: 'Add work permit', onClick: () => setAddDialogOpen(true)}]}
            >
              <div className="flex flex-col gap-y-1">
                {permits.map((p, i) => (
                  <WorkPermitRow
                    key={i}
                    type={p.type}
                    country={p.country}
                    description={p.description}
                    onEdit={() => setEditIndex(i)}
                    onDelete={() => deletePermit(i)}
                  />
                ))}
              </div>
            </GroupView>
          </div>

        </div>
      </PaneBody>

      <WorkPermitDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={savePermit}
      />

      {editingPermit && (
        <WorkPermitDialog
          open={editIndex !== null}
          onOpenChange={(v) => { if (!v) setEditIndex(null) }}
          initialType={editingPermit.type}
          initialCountry={editingPermit.country}
          onSave={(type, country) => {
            updatePermit(editIndex!, type, country)
            setEditIndex(null)
          }}
        />
      )}
    </Pane>
  )
}
