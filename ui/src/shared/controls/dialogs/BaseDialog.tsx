import {ReactNode} from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {X} from 'lucide-react'
import {IconButton} from '@/shared/controls/buttons/IconButton'

interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  width?: string
  onSubmit?: () => void
  children: ReactNode
}

export function BaseDialog({open, onOpenChange, title, width = 'w-[440px]', onSubmit, children}: BaseDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100]" style={{backgroundColor: 'color-mix(in srgb, var(--color-panel-black) 40%, transparent)'}} onClick={e => e.stopPropagation()}/>
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-panel-white rounded-lg ${width} max-w-[90vw] z-[101] flex flex-col shade-lg`}
          onClick={e => e.stopPropagation()}
          onOpenAutoFocus={e => e.preventDefault()}
          onInteractOutside={e => {
            const target = e.target as Element
            if (target.closest('[data-radix-popper-content-wrapper]')) e.preventDefault()
          }}
          onKeyDown={onSubmit ? (e => {
            if (e.key !== 'Enter') return
            if ((e.target as HTMLElement).getAttribute('role') === 'menuitem') return
            e.preventDefault(); onSubmit()
          }) : undefined}
        >
          <div className="flex items-center justify-between pl-5 pr-2 py-2 border-b border-frame-lighter shrink-0">
            <Dialog.Title className="text-lg font-semibold m-0">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton icon={X} label="Close" tooltip={false}/>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
