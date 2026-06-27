import {Building, Coins, Link, MapPin, Merge, MoreVertical, Paperclip, RefreshCw, Trash2, Unlink} from 'lucide-react'
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
  onSetUrl: () => void
  onClearUrl: () => void
  onSetLocation: () => void
  onSetWorkMode: () => void
  onSetCompensation: () => void
  onMergeInto: () => void
  onDelete: () => void
}

export function OpportunityMenu({
  opportunity,
  isChanging,
  isSourcing, isGeneratingCoverLetter,
  onSource, onGenerateCoverLetter, onSetUrl, onClearUrl, onSetLocation, onSetWorkMode, onSetCompensation, onMergeInto, onDelete,
}: OpportunityMenuProps) {
  const isJob = opportunity.type === 'job'

  const items = [
    {label: 'Re-score', icon: isSourcing ? <Spinner/> : <RefreshCw size="sm"/>, onClick: onSource, disabled: isChanging || isSourcing},
    ...(isJob ? [{
      label: 'Generate cover letter',
      icon: isGeneratingCoverLetter ? <Spinner/> : <Paperclip size="sm"/>,
      onClick: onGenerateCoverLetter,
      disabled: isChanging || isGeneratingCoverLetter,
    }] : []),
    {divider: true, label: '', onClick: () => {}},
    {label: 'Set URL…', icon: <Link size={14}/>, onClick: onSetUrl, disabled: isChanging},
    {label: 'Set location…', icon: <MapPin size={14}/>, onClick: onSetLocation, disabled: isChanging},
    ...(isJob ? [{label: 'Set work mode…', icon: <Building size={14}/>, onClick: onSetWorkMode, disabled: isChanging}] : []),
    {label: 'Set compensation…', icon: <Coins size={14}/>, onClick: onSetCompensation, disabled: isChanging},
    {divider: true, label: '', onClick: () => {}},
    ...(opportunity.url ? [{label: 'Clear URL…', icon: <Unlink size={14}/>, onClick: onClearUrl, disabled: isChanging}] : []),
    {divider: true, label: '', onClick: () => {}},
    {label: 'Merge into…', icon: <Merge size={14}/>, onClick: onMergeInto, disabled: isChanging},
    {divider: true, label: '', onClick: () => {}},
    {label: 'Delete…', icon: <Trash2 size="sm"/>, onClick: onDelete, danger: true, disabled: isChanging},
  ]

  return (
    <DropdownButton
      trigger={<IconButton icon={MoreVertical} label="More actions" tooltip={false} size="md"/>}
      items={items}
      align="end"
    />
  )
}
