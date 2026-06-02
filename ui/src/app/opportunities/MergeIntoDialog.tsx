import {useState} from 'react'
import {useNavigate} from 'react-router'
import {BaseDialog} from '@/shared/controls/dialogs/BaseDialog'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {ScoreBadge} from '@/shared/controls/buttons/ScoreBadge'
import {Spinner} from '@/shared/controls/Spinner'
import {ApiOpportunity, OpportunitySimilarity} from '@/app/opportunities/OpportunityTypes'

interface MergeIntoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  jobs: ApiOpportunity[]
  similarOpportunities: OpportunitySimilarity[]
  onMerge: (canonicalId: string) => void
  isMerging: boolean
}

export function MergeIntoDialog({
  open, onOpenChange,
  opportunityId,
  jobs,
  similarOpportunities,
  onMerge,
  isMerging,
}: MergeIntoDialogProps) {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const similarityMap = new Map<string, number>()
  for (const s of similarOpportunities) {
    const neighborId = s.id_a === opportunityId ? s.id_b : s.id_a
    similarityMap.set(neighborId, s.similarity)
  }

  const candidates = jobs
    .filter(j => j.id !== opportunityId)
    .sort((a, b) => {
      const sa = similarityMap.get(a.id) ?? 0
      const sb = similarityMap.get(b.id) ?? 0
      return sb - sa
    })

  const selectedJob = candidates.find(j => j.id === selectedId)
  const selectedLabel = selectedJob?.active_version.title ?? selectedId ?? ''

  function handleConfirm() {
    if (!selectedId) return
    setConfirmOpen(false)
    onMerge(selectedId)
    navigate(`/opportunities/jobs/${selectedId}`)
  }

  return (
    <BaseDialog
      open={open}
      onOpenChange={(v) => { if (!isMerging) { onOpenChange(v); setSelectedId(null) } }}
      title="Merge into…"
      width="w-[35vw]"
    >
      <div className="flex flex-col overflow-hidden max-h-[60vh]">
        <div className="px-5 pt-4 pb-2 text-label-darkest shrink-0">
          Select the opportunity to merge into. This one will be deleted and its notes moved there.
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-2">
          {candidates.map(job => {
            const sim = similarityMap.get(job.id)
            const isSelected = job.id === selectedId
            return (
              <div
                key={job.id}
                className={`flex items-center gap-2 px-2 h-[38px] cursor-pointer rounded ${isSelected ? 'bg-intent-info/10' : 'hoverable'}`}
                onClick={() => setSelectedId(job.id)}
              >
                {job.avatar_url
                  ? <img src={job.avatar_url} alt="" className="w-4 h-4 rounded object-contain shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
                  : <div className="w-4 h-4 shrink-0"/>
                }
                <span className="flex-1 truncate">{job.active_version.title ?? '(Untitled)'}</span>
                {job.active_version.organization_name && (
                  <span className="text-label-medium truncate shrink-0 max-w-[120px]">{job.active_version.organization_name}</span>
                )}
                {sim != null && (
                  <span className="text-sm text-label-medium shrink-0">{Math.round(sim * 100)}%</span>
                )}
                <ScoreBadge score={job.active_version.score} size="sm"/>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-frame-lighter shrink-0">
          <button className="secondary" onClick={() => { onOpenChange(false); setSelectedId(null) }} disabled={isMerging}>Cancel</button>
          <button className="primary" onClick={() => setConfirmOpen(true)} disabled={!selectedId || isMerging}>
            {isMerging ? <Spinner/> : 'Merge into selected…'}
          </button>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Merge into…"
        body={`This opportunity will be deleted. Its notes and job description will be moved to "${selectedLabel}" as a note. This cannot be undone.`}
        primaryActionLabel="Merge now"
        onConfirm={handleConfirm}
        isSubmitting={isMerging}
      />
    </BaseDialog>
  )
}
