import {useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {system} from '@/services/client'
import {Spinner} from '@/shared/controls/Spinner'

export function ServerTab() {
  const {data, isLoading, isError} = useQuery({
    queryKey: queryKeys.systemStatus,
    queryFn: system.status,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center gap-2 p-6 text-label-medium">
      <Spinner/>
      Loading server status…
    </div>
  )

  const isConnected = !isError && !!data

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <Row label="Status">
          <span className={`inline-flex items-center gap-2 ${isConnected ? 'text-intent-success' : 'text-label-medium'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-intent-success' : 'bg-frame-medium'}`}/>
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </Row>
      </div>
    </div>
  )
}

function Row({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between min-h-[32px]">
      <span className="text-label-darker">{label}</span>
      {children}
    </div>
  )
}
