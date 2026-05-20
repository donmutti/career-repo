import {useEffect, useRef, useState} from 'react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {agentRuns as agentRunsApi, inbox as inboxApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {queryKeys} from '@/services/queryKeys'

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled']

interface AgentRun {
  id: string
  status: string
  created_at: string
}

export function useInboxScan(activeWindow: string) {
  const [scanRunId, setScanRunId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount, check if a scan is already running on the server
  const {data: activeScanData} = useQuery({
    queryKey: queryKeys.inboxActiveScan,
    queryFn: inboxApi.activeScan,
    staleTime: 0,
  })
  useEffect(() => {
    if (activeScanData?.run_id && !scanRunId) {
      setScanRunId(activeScanData.run_id)
    }
  }, [activeScanData?.run_id])

  // Poll active scan run until terminal
  const {data: runData} = useQuery({
    queryKey: ['inbox', 'scan-run', scanRunId],
    queryFn: () => agentRunsApi.get(scanRunId!),
    enabled: !!scanRunId,
    refetchInterval: 2000,
  })
  const run = runData as AgentRun | undefined
  const runStatus = run?.status
  const runCreatedAt = run?.created_at

  useEffect(() => {
    if (runStatus && TERMINAL_STATUSES.includes(runStatus)) {
      setScanRunId(null)
      queryClient.invalidateQueries({queryKey: queryKeys.inboxStatus})
      queryClient.invalidateQueries({queryKey: queryKeys.inboxCounts})
      queryClient.invalidateQueries({queryKey: queryKeys.inboxSortedCounts})
      queryClient.invalidateQueries({queryKey: queryKeys.inboxList(activeWindow)})
      queryClient.invalidateQueries({queryKey: queryKeys.inboxActiveScan})
    }
  }, [runStatus, activeWindow])

  const scanning = !!scanRunId

  const startMutation = useMutation({
    mutationFn: () => inboxApi.scan(),
    onSuccess: (data) => {
      const {run_id} = data as { run_id: string }
      setScanRunId(run_id)
      queryClient.invalidateQueries({queryKey: queryKeys.inboxActiveScan})
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => agentRunsApi.cancel(scanRunId!),
    onSuccess: () => {
      setScanRunId(null)
      queryClient.invalidateQueries({queryKey: queryKeys.inboxActiveScan})
    },
  })

  // Elapsed timer — driven from run's created_at so remount shows correct value
  useEffect(() => {
    if (scanning && runCreatedAt) {
      const startedAt = new Date(/[Z+]/.test(runCreatedAt) ? runCreatedAt : runCreatedAt + 'Z').getTime()
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    } else if (!scanning) {
      setElapsed(0)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [scanning, runCreatedAt])

  return {
    scanning,
    elapsed,
    start: startMutation.mutate,
    cancel: cancelMutation.mutate,
  }
}
