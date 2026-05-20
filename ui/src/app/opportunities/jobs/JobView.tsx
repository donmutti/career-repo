import {useEffect, useRef, useState} from 'react'
import {useNavigate} from 'react-router'
import {ExternalLink, Pencil, Plus, RefreshCw, X} from 'lucide-react'
import {Spinner} from '@/shared/controls/Spinner'
import {Flow} from '@/shared/controls/Flow'
import {OpportunityMenu} from '@/app/opportunities/OpportunityMenu'
import {useOpportunity} from '@/app/opportunities/useOpportunity'
import {TextEdit} from '@/shared/controls/edits/TextEdit'
import {InlineEdit} from '@/shared/controls/edits/InlineEdit'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {ScoreDialog} from '@/shared/controls/dialogs/ScoreDialog'
import {GroupedListView} from '@/shared/controls/views/GroupedListView'
import {GroupView} from '@/shared/controls/views/GroupView'
import {ListView} from '@/shared/controls/views/ListView'
import {ShowMoreView} from '@/shared/controls/views/ShowMoreView'
import {CommentRow} from '@/app/opportunities/CommentRow'
import {AttachmentRow} from '@/app/opportunities/AttachmentRow'
import {ScoreBadge} from '@/shared/controls/buttons/ScoreBadge'
import {Attachment, Comment, STATUS_GROUPS} from '@/app/opportunities/OpportunityTypes'
import {formatDuration, formatPay} from '@/shared/utils/FormatUtils'
import {DateLabel} from '@/shared/controls/DateLabel'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface JobViewProps {
  opportunityId: string
}

export function JobView({opportunityId}: JobViewProps) {
  const navigate = useNavigate()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [descriptionEditing, setDescriptionEditing] = useState(false)
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false)

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
  } = useOpportunity(opportunityId, {

    onDeleted: () => {
      setDeleteDialogOpen(false)
      navigate('/opportunities/jobs')
    },

  })

  const [elapsedSecs, setElapsedSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (isChanging) {
      const raw = opportunity?.sourcing_started_at
      const parsed = raw ? new Date(/[Z+]/.test(raw) ? raw : raw + 'Z').getTime() : Date.now()
      const startedAt = (Date.now() - parsed) > 10_000 ? Date.now() : parsed
      setElapsedSecs(Math.floor((Date.now() - startedAt) / 1000))
      timerRef.current = setInterval(() => {
        setElapsedSecs(Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsedSecs(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isChanging, opportunity?.sourcing_started_at])

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
    activeVersion.job_pay_min,
    activeVersion.job_pay_max,
    activeVersion.job_pay_currency,
    activeVersion.job_pay_period
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
          onChange={(key) => patch({status: key})}
          disabled={isChanging}
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
        <div className="flex items-start px-5 pt-1 pb-6 border-b border-frame-lighter pr-6">
          <div className="flex flex-col flex-1 min-w-0">
            {opportunity.url && (
              <a href={opportunity.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 text-sm text-intent-info one-liner mb-2">
                {opportunity.avatar_url
                  ? <img src={opportunity.avatar_url} alt="" className="w-5 h-5 rounded object-contain shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
                  : <ExternalLink size={13} className="shrink-0"/>
                }
                {opportunity.url}
              </a>
            )}
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
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>
        </div>

        {pay && (
          <div className="px-8 pt-1 pb-5 border-b border-frame-lighter">
            <span className={`text-sm font-medium ${isChanging ? 'text-label-medium' : ''}`}>{pay}</span>
          </div>
        )}

        {/* Cover letters */}
        <div className="relative px-3 border-b border-frame-lighter pb-3">
          <div className="mx-3">
            <GroupView
              label="Cover letters"
              count={isGeneratingCoverLetter ? undefined : attachmentList.length}
              status={isGeneratingCoverLetter
                ? <><Spinner/> Generating for {formatDuration(coverLetterElapsed)}… <IconButton icon={X} label="Cancel" danger onClick={(e) => { e.stopPropagation(); cancelCoverLetter() }}/></>
                : undefined
              }
              actions={isGeneratingCoverLetter ? [] : [{
                icon: Plus, label: 'Generate cover letter', onClick: () => generateCoverLetter(), disabled: isChanging,
              }]}
            >
              {attachmentList.length > 0
                ? <ListView items={attachmentList} renderItem={(a) => <AttachmentRow attachment={a} onDelete={() => deleteAttachment(a.id)}/>}/>
                : !isGeneratingCoverLetter && <span className="ml-2 px-3 py-1 text-sm text-label-light">No cover letters</span>
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
