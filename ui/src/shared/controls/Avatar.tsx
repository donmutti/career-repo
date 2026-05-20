import {Building} from 'lucide-react'

interface AvatarProps {
  url?: string
  size?: 'sm' | 'md' | 'lg'
  alt?: string
  className?: string
}

const SIZE_CLASSES = {sm: 'w-6 h-6', md: 'w-9 h-9', lg: 'w-12 h-12'}
const ICON_SIZES = {sm: 16, md: 22, lg: 32}
const ICON_STROKES = {sm: 2, md: 2, lg: 1.2}

export function Avatar({url, size = 'md', alt = '', className = ''}: AvatarProps) {
  if (!url) {
    return (
      <div className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center shrink-0 text-label-light ${className}`}>
        <Building size={ICON_SIZES[size]} strokeWidth={ICON_STROKES[size]}/>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`${SIZE_CLASSES[size]} rounded-full object-cover shrink-0 ${className}`}
    />
  )
}
