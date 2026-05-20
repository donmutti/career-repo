import {useRef, useState} from 'react'
import {useNavigate, useParams, Outlet} from 'react-router'
import {BriefcaseBusiness, FileText, Plus, RefreshCw, X} from 'lucide-react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {LocalStorageUtils} from '@/shared/utils/LocalStorageUtils'
import {Pane, PaneBody, PaneHeader, PaneResizeHandle} from '@/shared/controls/panes/Panes'
import {EmptyState} from '@/shared/controls/views/EmptyState'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {ListView} from '@/shared/controls/views/ListView'
import {Spinner} from '@/shared/controls/Spinner'
import {WorkExperienceRow} from './WorkExperienceRow'
import {WorkExperienceDialog} from './WorkExperienceDialog'
import {WorkExperienceView} from './WorkExperienceView'
import {ResumeRow} from './ResumeRow'
import {ResumeView} from './ResumeView'
import {useResumeParser} from './useResumeParser'
import {formatDuration} from '@/shared/utils/FormatUtils'
import {DateLabel} from '@/shared/controls/DateLabel'

interface Resume { id: string; original_name: string; file_name: string; created_at: string }

export function ResumeDetailPane() {
  const navigate = useNavigate()
  const {data} = useQuery({queryKey: queryKeys.resumes, queryFn: profileApi.resumes.list})
  const resumes = (data as Resume[] | undefined) ?? []
  const resume = resumes[0] ?? null
  if (!resume) return null
  return (
    <ResumeView
      resumeId={resume.id}
      onDeleted={() => navigate('/profile/work-experience')}
    />
  )
}

export function WorkExperienceDetailPane() {
  const {id} = useParams<{id: string}>()
  if (!id) return null
  return <WorkExperienceView key={id} experienceId={id}/>
}

interface WorkExperienceVersion {
  company: string
  role: string
  start_date?: string
  end_date?: string
  description?: string
}

interface WorkExperience {
  id: string
  profile_id: string
  created_at: string
  active_version: WorkExperienceVersion
}

export default function ProfileWorkExperiencePage() {
  const navigate = useNavigate()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [listWidth, setListWidth] = useState(() => LocalStorageUtils.get('pane.profile.work-experience.list', 320))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {data: workExperiencesData} = useQuery({
    queryKey: queryKeys.workExperiences,
    queryFn: profileApi.workExperiences.list,
  })

  const {data: resumesData} = useQuery({
    queryKey: queryKeys.resumes,
    queryFn: profileApi.resumes.list,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => profileApi.resumes.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.resumes})
      navigate('/profile/work-experience/resume')
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: unknown) => profileApi.workExperiences.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({queryKey: queryKeys.workExperiences})
      const we = data as WorkExperience | undefined
      if (we?.id) navigate(`/profile/work-experience/${we.id}`)
    },
  })

  const {parsing, elapsed, lastSyncedAt, parse, cancel} = useResumeParser()

  const experiences = (workExperiencesData as WorkExperience[] | undefined) ?? []
  const resumes = (resumesData as Resume[] | undefined) ?? []
  const resume = resumes[0] ?? null

  const sortedExperiences = [...experiences].sort((a, b) =>
    (b.active_version.start_date ?? '').localeCompare(a.active_version.start_date ?? '')
  )

  function saveExperience(data: WorkExperienceVersion) {
    createMutation.mutate(data)
  }

  return (
    <>
      {/* List pane */}
      <div className="flex flex-col overflow-hidden shrink-0 min-w-[240px]" style={{width: listWidth}}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadMutation.mutate(file)
            e.target.value = ''
          }}
        />

        {/* Resume section */}
        <PaneHeader
          title="Resume"
          actions={<IconButton icon={Plus} label={uploadMutation.isPending ? 'Uploading…' : resume ? 'Replace resume' : 'Upload resume'} onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}/>}
        />
        {resume ? (
          <div className="px-2">
            <ListView
              items={[resume]}
              getItemKey={(r) => r.id}
              renderItem={(r) => <ResumeRow resume={r} navigateTo="/profile/work-experience/resume"/>}
            />
          </div>
        ) : (
            <div className="h-16 flex items-center justify-center">
              <EmptyState
                icon={FileText}
                description="Click + to upload resume"
              />
            </div>
          )}

        <div className="h-4 shrink-0 border-b border-frame-lighter"/>

        {/* Work experience section */}
        <PaneHeader
          title="Work experience"
          actions={
            <div className="flex items-center gap-1.5">
              {parsing ? (
                <>
                  <Spinner className="text-label-medium"/>
                  <span className="text-sm text-label-medium truncate">Syncing for {formatDuration(elapsed)}…</span>
                  <IconButton icon={X} label="Cancel" danger onClick={() => cancel()}/>
                </>
              ) : (
                <>
                  {lastSyncedAt && (
                    <span className="text-sm text-label-medium truncate">Synced <DateLabel date={lastSyncedAt}/></span>
                  )}
                  <IconButton icon={RefreshCw} label="Sync from resume" tooltip={true} onClick={() => resume && parse(resume.id)} disabled={!resume}/>
                  <IconButton icon={Plus} label="Add work experience" onClick={() => setAddDialogOpen(true)}/>
                </>
              )}
            </div>
          }
        />
        <PaneBody>
          {experiences.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No work experience"
              description="Click the + icon to add"
              className="flex flex-col items-center gap-2 p-8 text-center text-label-light pt-[80px]"
            />
          ) : (
            <>
              <div className="px-2">
                <ListView
                  items={sortedExperiences}
                  getItemKey={(e) => e.id}
                  renderItem={(e) => (
                    <WorkExperienceRow
                      experience={e}
                      navigateTo={`/profile/work-experience/${e.id}`}
                    />
                  )}
                />
              </div>
              <div className="h-32 shrink-0"/>
            </>
          )}
        </PaneBody>
      </div>

      <PaneResizeHandle onResize={(d) => setListWidth(w => {
        const n = Math.max(240, w + d)
        LocalStorageUtils.set('pane.profile.work-experience.list', n)
        return n
      })}/>

      {/* Detail pane */}
      <Pane>
        <Outlet/>
      </Pane>

      {/* Add dialog */}
      <WorkExperienceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={saveExperience}
        isSubmitting={createMutation.isPending}
      />
    </>
  )
}
