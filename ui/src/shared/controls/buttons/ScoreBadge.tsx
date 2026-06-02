interface ScoreBadgeProps {
  score: number | null | undefined
  size?: 'sm' | 'md'
}

function getColorClass(score: number): string {
  if (score >= 9.0) return 'text-score-a'
  if (score >= 7.0) return 'text-score-b'
  if (score >= 5.0) return 'text-score-c'
  if (score >= 3.0) return 'text-score-d'
  if (score >= 1.0) return 'text-score-e'
  return 'text-score-f'
}

export function ScoreBadge({score, size = 'sm'}: ScoreBadgeProps) {
  const sizeClass = size === 'sm' ? 'w-[30px] h-[22px] text-sm rounded-sm' : 'w-[32px] h-[24px] text-base rounded'
  if (score == null) {
    return (
      <span className={`inline-flex items-center justify-center font-medium text-label-medium border border-dotted border-frame-medium/70 ${sizeClass}`}>
        0.0
      </span>
    )
  }
  const isExcellent = score >= 9.0
  const borderClass = 'border border-current'
  const fillClass = isExcellent ? 'bg-score-a text-score-text border-score-a' : ''
  return (
    <span className={`inline-flex items-center justify-center font-medium text-center ${sizeClass} ${isExcellent ? fillClass : `${getColorClass(score)} ${borderClass}`}`}>
      {score.toFixed(1)}
    </span>
  )
}
