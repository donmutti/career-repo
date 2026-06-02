import {ExternalLink, Merge, MoreVertical, Paperclip, RefreshCw, Trash2} from 'lucide-react'
import {Spinner} from '@/shared/controls/Spinner'
import {DropdownButton} from '@/shared/controls/buttons/DropdownButton'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface Opportunity {
  type: string
  url?: string | null
}

interface OpportunityMenuProps {
  opportunity: Opportunity
  isChanging: boolean
  isSourcing: boolean
  isGeneratingCoverLetter: boolean
  onSource: () => void
  onGenerateCoverLetter: () => void
  onMergeInto: () => void
  onDelete: () => void
}

export function OpportunityMenu({
  opportunity,
  isChanging,
  isSourcing, isGeneratingCoverLetter,
  onSource, onGenerateCoverLetter, onMergeInto, onDelete,
}: OpportunityMenuProps) {
  const isJob = opportunity.type === 'job'

  const items = [
    ...(opportunity.url ? [{label: 'Visit URL', icon: <ExternalLink size="sm"/>, onClick: () => window.open(opportunity.url!, '_blank', 'noreferrer')}] : []),
    {divider: true, label: '', onClick: () => {}},
    {label: 'Re-score', icon: isSourcing ? <Spinner/> : <RefreshCw size="sm"/>, onClick: onSource, disabled: isChanging || isSourcing},
    ...(isJob ? [{
      label: 'Generate cover letter',
      icon: isGeneratingCoverLetter ? <Spinner/> : <Paperclip size="sm"/>,
      onClick: onGenerateCoverLetter,
      disabled: isChanging || isGeneratingCoverLetter,
    }] : []),
    {divider: true, label: '', onClick: () => {}},
    {label: 'Merge into…', icon: <Merge size={14}/>, onClick: onMergeInto, disabled: isChanging},
    {divider: true, label: '', onClick: () => {}},
    {label: 'Delete...', icon: <Trash2 size="sm"/>, onClick: onDelete, danger: true, disabled: isChanging},
  ]

  return (
    <DropdownButton
      trigger={<IconButton icon={MoreVertical} label="More actions" tooltip={false} size="md"/>}
      items={items}
      align="end"
    />
  )
}
