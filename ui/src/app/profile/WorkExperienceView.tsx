import {useState} from 'react'
import {useNavigate} from 'react-router'
import {Pencil, Plus, Trash2} from 'lucide-react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {PaneBody, PaneHeader} from '@/shared/controls/panes/Panes'
import {GroupedListView} from '@/shared/controls/views/GroupedListView'
import {GroupView} from '@/shared/controls/views/GroupView'
import {ListView} from '@/shared/controls/views/ListView'
import {InlineEdit} from '@/shared/controls/edits/InlineEdit'
import {MonthPicker} from '@/shared/controls/MonthPicker'
import {TextEdit} from '@/shared/controls/edits/TextEdit'
import {ShowMoreView} from '@/shared/controls/views/ShowMoreView'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {ProjectRow} from './ProjectRow'
import {ProjectDialog} from './ProjectDialog'

interface WorkExperienceProject {
  id: string
  work_experience_id: string
  name: string
  description?: string
  status?: string
  start_date?: string
  end_date?: string
}

interface WorkExperienceVersion {
  company: string
  role: string
  start_date?: string
  end_date?: string
  description?: string
  skills?: string
}

interface WorkExperience {
  id: string
  profile_id: string
  created_at: string
  active_version: WorkExperienceVersion
}

interface WorkExperienceViewProps {
  experienceId: string
}

export function WorkExperienceView({experienceId}: WorkExperienceViewProps) {
  const navigate = useNavigate()
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [editProject, setEditProject] = useState<WorkExperienceProject | null>(null)
  const [descriptionEditing, setDescriptionEditing] = useState(false)
  const [skillsEditing, setSkillsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {data: allExperiencesData} = useQuery({
    queryKey: queryKeys.workExperiences,
    queryFn: profileApi.workExperiences.list,
  })

  const {data: experienceData} = useQuery({
    queryKey: queryKeys.workExperience(experienceId),
    queryFn: () => profileApi.workExperiences.get(experienceId),
  })

  const {data: projectsData} = useQuery({
    queryKey: queryKeys.workExperienceProjects(experienceId),
    queryFn: () => profileApi.workExperiences.projects.list(experienceId),
  })

  const patchExperienceMutation = useMutation({
    mutationFn: (data: unknown) => profileApi.workExperiences.patch(experienceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.workExperience(experienceId)})
      queryClient.invalidateQueries({queryKey: queryKeys.workExperiences})
    },
  })

  const addProjectMutation = useMutation({
    mutationFn: (data: unknown) => profileApi.workExperiences.projects.create(experienceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.workExperienceProjects(experienceId)})
      setAddProjectOpen(false)
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({id, data}: { id: string; data: unknown }) => profileApi.workExperiences.projects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.workExperienceProjects(experienceId)})
      setEditProject(null)
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => profileApi.workExperiences.projects.delete(id),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.workExperienceProjects(experienceId)}),
  })

  const deleteExperienceMutation = useMutation({
    mutationFn: () => profileApi.workExperiences.delete(experienceId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.workExperiences})
      const all = (allExperiencesData as WorkExperience[] | undefined) ?? []
      const sorted = [...all].sort((a, b) => (b.active_version.start_date ?? '').localeCompare(a.active_version.start_date ?? ''))
      const idx = sorted.findIndex(e => e.id === experienceId)
      const sibling = sorted[idx + 1] ?? sorted[idx - 1]
      navigate(sibling ? `/profile/work-experience/${sibling.id}` : '/profile/work-experience', {replace: true})
    },
  })

  const experience = experienceData as WorkExperience | undefined
  const projects = (projectsData as WorkExperienceProject[] | undefined) ?? []

  if (!experience) return null

  const v = experience.active_version

  function patchField(field: string, value: string | null) {
    patchExperienceMutation.mutate({[field]: value})
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PaneHeader title={v.role} actions={<IconButton icon={Trash2} label="Delete work experience" danger onClick={() => setConfirmDelete(true)}/>}/>
      <PaneBody>
        <div className="flex flex-col">

          {/* Header grid */}
          <div className="px-6 py-4 border-b border-frame-lighter">
            <div className="grid gap-x-3 gap-y-0" style={{gridTemplateColumns: 'auto 1fr'}}>

              {/* Company */}
              <span className="text-label-medium self-center min-h-[32px] flex items-center">Company</span>
              <InlineEdit
                value={v.company}
                placeholder="Company name"
                doubleClickToEdit
                onSubmit={(val) => patchField('company', val)}
              />

              {/* Role */}
              <span className="text-label-medium self-center min-h-[32px] flex items-center">Role</span>
              <InlineEdit
                value={v.role}
                placeholder="Role title"
                doubleClickToEdit
                onSubmit={(val) => patchField('role', val)}
              />

              {/* Period */}
              <span className="text-label-medium self-center min-h-[32px] flex items-center">Period</span>
              <div className="flex items-center gap-2 w-56">
                <MonthPicker
                  value={v.start_date ?? ''}
                  onChange={(val) => patchField('start_date', val ?? null)}
                  placeholder="Start"
                />
                <span className="text-label-medium shrink-0">–</span>
                <MonthPicker
                  value={v.end_date ?? ''}
                  onChange={(val) => patchField('end_date', val ?? null)}
                  placeholder="Present"
                />
              </div>

            </div>
          </div>

          {/* Description */}
          <div className="border-b border-frame-lighter py-3 px-3">
            <GroupedListView
              groups={[{
                key: 'description',
                label: 'Description',
                items: [null],
                actions: [{
                  icon: Pencil, label: 'Edit', onClick: () => setDescriptionEditing(true), expandGroup: true,
                }],
              }]}
              row={() => (
                <ShowMoreView forceExpanded={descriptionEditing}>
                  <TextEdit
                    value={v.description ?? ''}
                    placeholder="No description"
                    allowEmpty
                    doubleClickToEdit
                    editing={descriptionEditing}
                    onEditingChange={setDescriptionEditing}
                    onSubmit={(val) => patchField('description', val || null)}
                  />
                </ShowMoreView>
              )}
            />
          </div>

          {/* Skills */}
          <div className="border-b border-frame-lighter py-3 px-3">
            <GroupedListView
              groups={[{
                key: 'skills',
                label: 'Skills',
                items: [null],
                actions: [{
                  icon: Pencil, label: 'Edit', onClick: () => setSkillsEditing(true), expandGroup: true,
                }],
              }]}
              row={() => (
                <ShowMoreView forceExpanded={skillsEditing}>
                  <TextEdit
                    value={v.skills ?? ''}
                    placeholder="No skills"
                    allowEmpty
                    doubleClickToEdit
                    editing={skillsEditing}
                    onEditingChange={setSkillsEditing}
                    onSubmit={(val) => patchField('skills', val || null)}
                  />
                </ShowMoreView>
              )}
            />
          </div>

          {/* Projects group */}
          <div className="py-3 px-3">
            <div className="mx-3">
              <GroupView
                label="Projects"
                count={projects.length}
                actions={[{icon: Plus, label: 'Add project', onClick: () => setAddProjectOpen(true)}]}
              >
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-label-light">No projects yet</div>
                ) : (
                  <div className="-mr-2 ml-1">
                    <ListView
                      items={projects}
                      getItemKey={(p) => p.id}
                      showItemDividers
                      renderItem={(p) => (
                        <ProjectRow
                          name={p.name}
                          description={p.description}
                          status={p.status}
                          start_date={p.start_date}
                          end_date={p.end_date}
                          onEdit={() => setEditProject(p)}
                          onDelete={() => deleteProjectMutation.mutate(p.id)}
                        />
                      )}
                    />
                  </div>
                )}
              </GroupView>
            </div>
          </div>
        </div>

        <div className="h-32 shrink-0"/>
      </PaneBody>

      {/* Add project dialog */}
      <ProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onSave={(data) => addProjectMutation.mutate(data)}
        isSubmitting={addProjectMutation.isPending}
      />

      {/* Edit project dialog */}
      {editProject && (
        <ProjectDialog
          open={!!editProject}
          onOpenChange={(v) => { if (!v) setEditProject(null) }}
          initialName={editProject.name}
          initialDescription={editProject.description ?? ''}
          initialStatus={editProject.status ?? ''}
          initialStartDate={editProject.start_date ?? ''}
          initialEndDate={editProject.end_date ?? ''}
          onSave={(data) => updateProjectMutation.mutate({id: editProject.id, data})}
          isSubmitting={updateProjectMutation.isPending}
        />
      )}

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete work experience"
        body={`Delete "${v.role}" at ${v.company}? This cannot be undone.`}
        primaryActionLabel="Delete"
        severity="danger"
        onConfirm={() => deleteExperienceMutation.mutate()}
      />
    </div>
  )
}
