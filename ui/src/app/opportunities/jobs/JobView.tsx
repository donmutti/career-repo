import {useEffect, useRef, useState} from 'react'
import {useNavigate} from 'react-router'
import {Briefcase, Coins, ExternalLink, MapPin, Pencil, Plus, RefreshCw, X} from 'lucide-react'
import {Spinner} from '@/shared/controls/Spinner'
import {Flow} from '@/shared/controls/Flow'
import {OpportunityMenu} from '@/app/opportunities/OpportunityMenu'
import {useOpportunity} from '@/app/opportunities/useOpportunity'
import {TextEdit} from '@/shared/controls/edits/TextEdit'
import {InlineEdit} from '@/shared/controls/edits/InlineEdit'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {ScoreDialog} from '@/shared/controls/dialogs/ScoreDialog'
import {ValueDialog} from '@/shared/controls/dialogs/ValueDialog'
import {GroupedListView} from '@/shared/controls/views/GroupedListView'
import {GroupView} from '@/shared/controls/views/GroupView'
import {ListView} from '@/shared/controls/views/ListView'
import {ShowMoreView} from '@/shared/controls/views/ShowMoreView'
import {CommentRow} from '@/app/opportunities/CommentRow'
import {AttachmentRow} from '@/app/opportunities/AttachmentRow'
import {SimilarOpportunityRow} from '@/app/opportunities/SimilarOpportunityRow'
import {MergeIntoDialog} from '@/app/opportunities/MergeIntoDialog'
import {ReasonDialog} from '@/app/inbox/ReasonDialog'
import {CompensationDialog} from './CompensationDialog'
import {WORK_MODE_LABELS, WorkModeDialog} from './WorkModeDialog'
import {ScoreBadge} from '@/shared/controls/buttons/ScoreBadge'
import {Attachment, Comment, OpportunitySimilarity, STATUS_GROUPS} from '@/app/opportunities/OpportunityTypes'
import {useOpportunities} from '@/app/opportunities/useOpportunities'
import {formatDuration, formatPay} from '@/shared/utils/FormatUtils'
import {DateLabel} from '@/shared/controls/DateLabel'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface JobViewProps {
  opportunityId: string
}

export function JobView({opportunityId}: JobViewProps) {
  const navigate = useNavigate()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mergeIntoDialogOpen, setMergeIntoDialogOpen] = useState(false)
  const [setUrlDialogOpen, setSetUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [descriptionEditing, setDescriptionEditing] = useState(false)
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false)
  const [clearUrlDialogOpen, setClearUrlDialogOpen] = useState(false)
  const [compensationDialogOpen, setCompensationDialogOpen] = useState(false)
  const [archiveReasonOpen, setArchiveReasonOpen] = useState(false)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [workModeDialogOpen, setWorkModeDialogOpen] = useState(false)

  const {
    opportunity,
    isLoading,
    patch,
    source, isSourcing, isChanging, cancelEvaluation,
    attachments,
    comments, addComment, updateComment, deleteComment,
    generateCoverLetter, isGeneratingCoverLetter, coverLetterRunCreatedAt, cancelCoverLetter,
    deleteAttachment,
    deleteOpportunity, isDeletingOpportunity,
    similarOpportunities, absorb, isAbsorbing,
    mergeInto, isMergingInto,
    setUrl, isSettingUrl,
    setCompensation,
  } = useOpportunity(opportunityId, {

    onDeleted: () => {
      setDeleteDialogOpen(false)
      navigate('/opportunities/jobs')
    },


  })

  const [, setTick] = useState(0)
  const localScoringStartRef = useRef<number | null>(null)
  if (isSourcing && localScoringStartRef.current === null) localScoringStartRef.current = Date.now()
  if (!isChanging) localScoringStartRef.current = null
  useEffect(() => {
    if (!isChanging) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [isChanging, opportunityId])
  const serverStart = opportunity?.sourcing_started_at
    ? new Date(/[Z+]/.test(opportunity.sourcing_started_at) ? opportunity.sourcing_started_at : opportunity.sourcing_started_at + 'Z').getTime()
    : null
  const scoringStart = localScoringStartRef.current != null && (serverStart == null || serverStart < localScoringStartRef.current)
    ? localScoringStartRef.current
    : serverStart
  const elapsedSecs = isChanging && scoringStart != null ? Math.floor((Date.now() - scoringStart) / 1000) : 0

  const [coverLetterElapsed, setCoverLetterElapsed] = useState(0)
  const coverLetterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (isGeneratingCoverLetter && coverLetterRunCreatedAt) {
      const startedAt = new Date(/[Z+]/.test(coverLetterRunCreatedAt) ? coverLetterRunCreatedAt : coverLetterRunCreatedAt + 'Z').getTime()
      setCoverLetterElapsed(Math.floor((Date.now() - startedAt) / 1000))
      coverLetterTimerRef.current = setInterval(() => {
        setCoverLetterElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    } else {
      if (coverLetterTimerRef.current) clearInterval(coverLetterTimerRef.current)
      setCoverLetterElapsed(0)
    }
    return () => { if (coverLetterTimerRef.current) clearInterval(coverLetterTimerRef.current) }
  }, [isGeneratingCoverLetter, coverLetterRunCreatedAt])

  const {opportunities} = useOpportunities()
  const jobs = opportunities.filter(o => o.type === 'job')

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner/>
      </div>
    )
  }

  if (!opportunity) return null

  const activeVersion = opportunity.active_version

  const pay = formatPay(
    activeVersion.job_pay_min ?? undefined,
    activeVersion.job_pay_max ?? undefined,
    activeVersion.job_pay_currency ?? undefined,
    activeVersion.job_pay_period ?? undefined
  )
  const commentList = (comments as { items?: Comment[] })?.items ?? (Array.isArray(comments) ? comments as Comment[] : [])
  const attachmentList = (attachments as { items?: Attachment[] })?.items ?? (Array.isArray(attachments) ? attachments as Attachment[] : [])

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b pr-6 border-frame-lighter shrink-0 h-14">

        {/* Status flow */}
        <Flow
          steps={STATUS_GROUPS}
          value={activeVersion.status}
          onChange={(key) => {
            if (key === 'closed') {
              setArchiveReasonOpen(true)
            } else {
              patch({status: key})
            }
          }}
        />

        {/* Evaluation + Score */}
        <div className="ml-auto flex items-center gap-2">
          {isChanging ? (
            <>
              <span className="flex items-center gap-1.5 text-sm text-label-medium one-liner">
                <Spinner/>
                Scoring for {formatDuration(elapsedSecs)}…
              </span>
              <IconButton icon={X} label="Cancel scoring" danger onClick={() => cancelEvaluation(opportunity.sourcing_agent_run_id!)}/>
            </>
          ) : (
            <>
              {opportunity.sourcing_completed_at && (
                <span className="text-sm text-label-medium one-liner">Scored <DateLabel date={opportunity.sourcing_completed_at}/></span>
              )}
              <IconButton label={activeVersion.score != null ? 'Re-score' : 'Score'} tooltip={true} icon={RefreshCw} onClick={() => source()}/>
            </>
          )}
          <button className="cursor-pointer" onClick={() => setScoreDialogOpen(true)}>
            <ScoreBadge score={activeVersion.score} size="md"/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-5 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-start px-5 pt-0 pb-4 border-b border-frame-lighter pr-6">
          <div className="flex flex-col flex-1 min-w-0">
            <div
              className={`h-9 flex items-center rounded ${isChanging ? '' : 'hoverable hoverable-text cursor-pointer'}`}
              onClick={isChanging ? undefined : () => {
                setUrlInput(opportunity.url ?? '');
                setSetUrlDialogOpen(true)
              }}
            >
              {opportunity.url
                ? <a href={opportunity.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={`flex items-center gap-1.5 px-3 one-liner ${isChanging ? 'text-label-medium' : 'text-intent-info'}`}>
                  {opportunity.avatar_url
                    ? <img src={opportunity.avatar_url} alt="" className="w-5 h-5 rounded object-contain shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
                    : <ExternalLink size={13} className="shrink-0"/>
                  }
                  {opportunity.url}
                </a>
                : <span className="px-3 text-label-medium">URL</span>
              }
            </div>
            <InlineEdit
              value={activeVersion.title ?? ''}
              placeholder="Job title"
              className="text-xl font-semibold"
              allowEmpty
              doubleClickToEdit
              disabled={isChanging}
              onSubmit={(v) => patch({title: v})}
            />
            <InlineEdit
              value={activeVersion.organization_name ?? ''}
              placeholder="Organization"
              className="text-base"
              allowEmpty
              doubleClickToEdit
              disabled={isChanging}
              onSubmit={(v) => patch({organization_name: v})}
            />
          </div>

          <div className="shrink-0 pt-1">
            <OpportunityMenu
              opportunity={opportunity}
              isChanging={isChanging}
              isSourcing={isSourcing}
              isGeneratingCoverLetter={isGeneratingCoverLetter}
              onSource={() => source()}
              onGenerateCoverLetter={() => generateCoverLetter()}
              onSetUrl={() => {
                setUrlInput(opportunity.url ?? '');
                setSetUrlDialogOpen(true)
              }}
              onClearUrl={() => setClearUrlDialogOpen(true)}
              onSetLocation={() => {
                setLocationInput(activeVersion.location ?? '');
                setLocationDialogOpen(true)
              }}
              onSetWorkMode={() => setWorkModeDialogOpen(true)}
              onSetCompensation={() => setCompensationDialogOpen(true)}
              onMergeInto={() => setMergeIntoDialogOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pt-1 pb-4 border-b border-frame-lighter">
          <div className="flex items-center gap-1">
            <button
              className={`flex items-center gap-1 p-2 one-liner rounded hoverable hoverable-text ${activeVersion.location ? `font-medium ${isChanging ? 'text-label-medium' : ''}` : 'text-label-medium'}`}
              onClick={() => {
                setLocationInput(activeVersion.location ?? '');
                setLocationDialogOpen(true)
              }}
            >
              <MapPin size={13} className="shrink-0"/>
              {activeVersion.location || 'Location'}
            </button>
            <button
              className={`flex items-center gap-1 p-2 one-liner rounded hoverable hoverable-text ${activeVersion.job_work_mode ? `font-medium ${isChanging ? 'text-label-medium' : ''}` : 'text-label-medium'}`}
              onClick={() => setWorkModeDialogOpen(true)}
            >
              <Briefcase size={13} className="shrink-0"/>
              {activeVersion.job_work_mode ? WORK_MODE_LABELS[activeVersion.job_work_mode] : 'Work mode'}
            </button>
          </div>
          <button
            className={`flex items-center gap-1 p-2 w-fit rounded hoverable hoverable-text ${pay ? `font-medium ${isChanging ? 'text-label-medium' : ''}` : 'text-label-medium'}`}
            onClick={() => setCompensationDialogOpen(true)}
          >
            <Coins size={13} className="shrink-0"/>
            {pay ?? 'Compensation'}
          </button>
        </div>

        {/* Cover letters */}
        <div className="relative px-3 border-b border-frame-lighter pb-3">
          <div className="mx-3">
            <GroupView
              label="Cover letters"
              count={isGeneratingCoverLetter ? undefined : attachmentList.length}
              status={isGeneratingCoverLetter
                ? <><Spinner/> Generating for {formatDuration(coverLetterElapsed)}… <IconButton icon={X} label="Cancel" danger onClick={(e) => {
                  e.stopPropagation();
                  cancelCoverLetter()
                }}/></>
                : undefined
              }
              actions={isGeneratingCoverLetter ? [] : [{
                icon: Plus, label: 'Generate cover letter', onClick: () => generateCoverLetter(), disabled: isChanging,
              }]}
            >
              {attachmentList.length > 0
                ? <ListView items={attachmentList} renderItem={(a) => <AttachmentRow attachment={a} onDelete={() => deleteAttachment(a.id)}/>}/>
                : !isGeneratingCoverLetter && <span className="ml-2 px-3 py-1 text-label-light">No cover letters</span>
              }
            </GroupView>
          </div>
        </div>

        {/* Description */}
        <div className="relative px-3 border-b border-frame-lighter pb-3">
          <GroupedListView
            groups={[{
              key: 'description',
              label: 'Job description',
              items: [null],
              actions: [{
                icon: Pencil, label: 'Edit', onClick: () => setDescriptionEditing(true), expandGroup: true, disabled: isChanging
              }],
            }]}
            row={() => (
              <ShowMoreView forceExpanded={descriptionEditing}>
                <TextEdit
                  value={activeVersion.description ?? ''}
                  placeholder="No description"
                  disabled={isChanging}
                  onSubmit={(v) => { patch({description: v || null}) }}
                  allowEmpty
                  doubleClickToEdit
                  editing={descriptionEditing}
                  onEditingChange={setDescriptionEditing}
                />
              </ShowMoreView>
            )}
          />
        </div>

        {/* Similar opportunities */}
        {(similarOpportunities as OpportunitySimilarity[]).length > 0 && (
          <div className="px-3 border-b border-frame-lighter pb-3">
            <div className="mx-3">
              <GroupView
                label="Similar opportunities"
                count={(similarOpportunities as OpportunitySimilarity[]).length}
              >
                <div className="flex flex-col gap-y-1 px-2">
                  {(similarOpportunities as OpportunitySimilarity[]).map(match => (
                    <SimilarOpportunityRow
                      key={`${match.id_a}-${match.id_b}`}
                      match={match}
                      opportunityId={opportunityId}
                      onAbsorb={() => absorb(match.id_a === opportunityId ? match.id_b : match.id_a)}
                      isAbsorbing={isAbsorbing}
                    />
                  ))}
                </div>
              </GroupView>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-3 border-b border-frame-lighter pb-3">
          <GroupedListView
            groups={[{
              key: 'notes',
              label: 'Notes',
              count: commentList.length,
              items: addingNote ? [null, ...commentList] : commentList,
              actions: [{
                icon: Plus, label: 'Add note', onClick: () => setAddingNote(true), expandGroup: true, disabled: isChanging
              }],
            }]}
            row={(c: Comment | null) => c ? (
              <CommentRow
                key={c.id}
                comment={c}
                onSave={(body) => addComment(body)}
                onUpdate={(body) => updateComment({id: c.id, body})}
                onDelete={() => deleteComment(c.id)}
              />
            ) : (
              <CommentRow
                onSave={(body) => {
                  addComment(body)
                  setAddingNote(false)
                }}
                onCancel={() => setAddingNote(false)}
              />
            )}
          />
        </div>
        <div className="h-32 shrink-0"/>
      </div>

      {/* Score dialog */}
      <ScoreDialog
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        score={activeVersion.score}
        explanation={activeVersion.score_explanation}
        title={activeVersion.title}
        organizationName={activeVersion.organization_name}
        url={opportunity.url}
        onRescore={() => source()}
      />

      {/* Set URL dialog */}
      <ValueDialog
        open={setUrlDialogOpen}
        onOpenChange={setSetUrlDialogOpen}
        title="Set URL"
        submitLabel="Save"
        isSubmitting={isSettingUrl}
        onSubmit={() => {
          setUrl(urlInput);
          setSetUrlDialogOpen(false)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label>URL</label>
          <input
            ref={el => { el && setTimeout(() => el.focus(), 0) }}
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setUrl(urlInput);
                setSetUrlDialogOpen(false)
              }
            }}
            className="w-full"
          />
        </div>
      </ValueDialog>

      <ValueDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        title="Set location"
        submitLabel="Save"
        onSubmit={() => {
          patch({location: locationInput});
          setLocationDialogOpen(false)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label>Location</label>
          <input
            ref={el => { el && setTimeout(() => el.focus(), 0) }}
            type="text"
            placeholder="e.g. Luxembourg, Remote"
            value={locationInput}
            onChange={e => setLocationInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                patch({location: locationInput});
                setLocationDialogOpen(false)
              }
            }}
            className="w-full"
          />
        </div>
      </ValueDialog>

      <WorkModeDialog
        open={workModeDialogOpen}
        onOpenChange={setWorkModeDialogOpen}
        value={activeVersion.job_work_mode}
        onSubmit={(v) => {
          patch({job_work_mode: v});
          setWorkModeDialogOpen(false)
        }}
      />

      {/* Merge into dialog */}
      <MergeIntoDialog
        open={mergeIntoDialogOpen}
        onOpenChange={setMergeIntoDialogOpen}
        opportunityId={opportunityId}
        jobs={jobs}
        similarOpportunities={similarOpportunities as OpportunitySimilarity[]}
        onMerge={(canonicalId) => mergeInto(canonicalId)}
        isMerging={isMergingInto}
      />

      {/* Clear URL dialog */}
      <ConfirmationDialog
        open={clearUrlDialogOpen}
        onOpenChange={setClearUrlDialogOpen}
        title="Clear URL"
        body="This will remove the URL from this opportunity."
        primaryActionLabel="Clear URL"
        onConfirm={() => {
          setUrl('');
          setClearUrlDialogOpen(false)
        }}
        isSubmitting={isSettingUrl}
      />

      {/* Compensation dialog */}
      <CompensationDialog
        open={compensationDialogOpen}
        onOpenChange={setCompensationDialogOpen}
        payMin={activeVersion.job_pay_min}
        payMax={activeVersion.job_pay_max}
        payCurrency={activeVersion.job_pay_currency}
        payPeriod={activeVersion.job_pay_period}
        onSubmit={(data) => {
          setCompensation(data);
          setCompensationDialogOpen(false)
        }}
      />

      <ReasonDialog
        open={archiveReasonOpen}
        onOpenChange={setArchiveReasonOpen}
        title="Why archiving?"
        submitLabel="Archive"
        onSubmit={(reason) => patch({status: 'closed', archive_reason: reason ?? 'Not for me'})}
      />

      {/* Delete dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete opportunity"
        body="This will permanently delete the opportunity. This action cannot be undone."
        primaryActionLabel="Delete"
        severity="danger"
        onConfirm={() => deleteOpportunity()}
        isSubmitting={isDeletingOpportunity}
      />
    </div>
  )
}
