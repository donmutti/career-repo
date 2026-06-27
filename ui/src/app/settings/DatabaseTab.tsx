import {useState} from 'react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {settings, DbStats, PurgeResult} from '@/services/client'
import {queryKeys} from '@/services/queryKeys'
import {queryClient} from '@/services/queryClient'
import {Spinner} from '@/shared/controls/Spinner'
import {ConfirmationDialog} from '@/shared/controls/dialogs/ConfirmationDialog'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export function DatabaseTab() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const {data, isLoading} = useQuery({
    queryKey: queryKeys.settingsDb,
    queryFn: settings.db.get,
  })

  const purge = useMutation({
    mutationFn: () => settings.db.purge(),
    onSuccess: (next: PurgeResult) => {
      const {deleted: _ignored, ...stats} = next
      void _ignored
      queryClient.setQueryData<DbStats>(queryKeys.settingsDb, stats)
      setConfirmOpen(false)
    },
  })

  if (isLoading || !data) return <div className="flex justify-center p-6"><Spinner/></div>

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <Stat label="Database size" value={formatBytes(data.size_bytes)}/>
      </div>

      <div className="rounded-md bg-panel-lightest p-4 flex flex-col gap-3">
        <Stat label="Active versions" value={String(data.active_version_count)}/>
        <Stat label="Historical versions" value={String(data.historical_version_count)}/>
      </div>

      <div className="pt-2">
        <button
          className="danger"
          disabled={data.historical_version_count === 0 || purge.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          Purge historical versions
        </button>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Purge historical versions"
        body={`Delete ${data.historical_version_count} historical version row(s)? Active versions are preserved. This cannot be undone.`}
        primaryActionLabel="Purge"
        severity="danger"
        onConfirm={() => purge.mutate()}
        isSubmitting={purge.isPending}
      />
    </div>
  )
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-center justify-between min-h-[32px]">
      <span className="text-label-darker">{label}</span>
      <span className="text-label-darker font-medium">{value}</span>
    </div>
  )
}
