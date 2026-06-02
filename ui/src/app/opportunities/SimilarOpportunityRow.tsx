import {useState} from 'react'
import {MoreVertical, SquaresUnite} from 'lucide-react'
import {useNavigate} from 'react-router'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {IconButton} from '@/shared/controls/buttons/IconButton'
import {OpportunitySimilarity} from '@/app/opportunities/OpportunityTypes'

interface SimilarOpportunityRowProps {
  match: OpportunitySimilarity
  opportunityId: string
  onAbsorb: () => void
  isAbsorbing: boolean
}

export function SimilarOpportunityRow({match, opportunityId, onAbsorb, isAbsorbing}: SimilarOpportunityRowProps) {
  const [absorbDialogOpen, setAbsorbDialogOpen] = useState(false)
  const navigate = useNavigate()

  const neighborId = match.id_a === opportunityId ? match.id_b : match.id_a
  const label = [match.title, match.organization_name].filter(Boolean).join(' \u2013 ')
  const displayTitle = match.title || label || neighborId
  const pct = Math.round(match.similarity * 100)

  const menuItems = [
    {label: 'Merge here…', icon: <SquaresUnite size={14}/>, onClick: () => setAbsorbDialogOpen(true)},
  ]

  return (
    <div
      className="relative group flex items-center gap-2 px-3 h-[38px] hoverable rounded-[6px] cursor-pointer"
      onClick={() => navigate(`/opportunities/jobs/${neighborId}`)}
    >
      {match.avatar_url && (
        <img
          src={match.avatar_url}
          alt=""
          className="w-5 h-5 rounded object-contain shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}

      <span className="flex-1 truncate text-label-darker">{label || neighborId}</span>

      <span className="text-sm text-label-medium shrink-0 mr-2">{pct}% match</span>

      <div
        className="invisible group-hover:visible has-[[data-state=open]]:visible shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownButton
          trigger={<IconButton icon={MoreVertical} label="More actions" tooltip={false} size="sm"/>}
          items={menuItems}
          align="end"
        />
      </div>

      <ConfirmationDialog
        open={absorbDialogOpen}
        onOpenChange={setAbsorbDialogOpen}
        title="Merge here"
        body={`"${displayTitle}" will be deleted. Its notes and job description will be moved here as a note. This cannot be undone.`}
        primaryActionLabel="Merge here"
        onConfirm={() => {
          setAbsorbDialogOpen(false)
          onAbsorb()
        }}
        isSubmitting={isAbsorbing}
      />
    </div>
  )
}
