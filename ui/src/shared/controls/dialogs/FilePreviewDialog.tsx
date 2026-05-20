import * as Dialog from '@radix-ui/react-dialog'
import {Download, ExternalLink, X} from 'lucide-react'

interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  fileType: string
  filePath: string
  title?: string
}

export function FilePreviewDialog({open, onOpenChange, fileType, filePath, title}: FilePreviewDialogProps) {
  const downloadUrl = `/api/attachments/${filePath}/download`
  const isPreviewable = fileType && ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt', 'md'].includes(fileType.toLowerCase())

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100]" style={{backgroundColor: 'color-mix(in srgb, var(--color-panel-black) 50%, transparent)'}}/>
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-panel-white rounded-lg w-[80vw] max-w-[900px] h-[80vh] z-[101] flex flex-col overflow-hidden shade-xl"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-frame-lightest shrink-0">
            <Dialog.Title className="flex-1 text-sm font-semibold m-0 one-liner">
              {title ?? 'File Preview'}
            </Dialog.Title>
            <a href={downloadUrl} target="_blank" rel="noreferrer" download aria-label="Download" className="flex text-label-medium">
              <Download size={16}/>
            </a>
            <a href={downloadUrl} target="_blank" rel="noreferrer" aria-label="Open" className="flex text-label-medium">
              <ExternalLink size={16}/>
            </a>
            <Dialog.Close asChild>
              <button aria-label="Close" className="flex text-label-light">
                <X size={16}/>
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-hidden bg-panel-lightest">
            {isPreviewable ? (
              <iframe
                src={downloadUrl}
                className="w-full h-full border-none"
                title={title ?? 'File preview'}
              />
            ) : (
              <div className="h-full flex items-center justify-center flex-col gap-3">
                <p className="text-label-medium text-sm">Preview not available for this file type.</p>
                <a href={downloadUrl} download className="primary no-underline">Download to view</a>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
