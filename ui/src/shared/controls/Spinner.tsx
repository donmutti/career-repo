import {Loader2} from 'lucide-react'

interface SpinnerProps {
  className?: string;
}

export function Spinner({className}: SpinnerProps) {
  return <Loader2 className={`spinning ${className}`} size={16}/>
}
