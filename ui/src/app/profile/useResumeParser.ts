import {useEffect, useRef, useState} from 'react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {agentRuns as agentRunsApi, profile as profileApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {queryKeys} from '@/services/queryKeys'

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled']

const LAST_SYNCED_KEY = 'resume-parser.last-synced-at'

interface AgentRun {
  id: string
  status: string
  created_at: string
  completed_at?: string
}

export function useResumeParser() {
  const [runId, setRunId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => localStorage.getItem(LAST_SYNCED_KEY))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount, recover any in-progress run from the server
  const {data: activeRunData} = useQuery({
    queryKey: queryKeys.activeParseRun,
    queryFn: profileApi.resumes.activeParseRun,
    staleTime: 0,
  })
  useEffect(() => {
    if (activeRunData?.run_id && !runId) {
      setRunId(activeRunData.run_id)
    }
  }, [activeRunData?.run_id])

  const {data: runData} = useQuery({
    queryKey: ['resume-parser', 'run', runId],
    queryFn: () => agentRunsApi.get(runId!),
    enabled: !!runId,
    refetchInterval: 2000,
  })
  const run = runData as AgentRun | undefined
  const runStatus = run?.status
  const runCreatedAt = run?.created_at

  useEffect(() => {
    if (runStatus && TERMINAL_STATUSES.includes(runStatus)) {
      if (runStatus === 'completed') {
        const ts = run?.completed_at ?? new Date().toISOString()
        localStorage.setItem(LAST_SYNCED_KEY, ts)
        setLastSyncedAt(ts)
      }
      setRunId(null)
      queryClient.invalidateQueries({queryKey: queryKeys.workExperiences})
      queryClient.invalidateQueries({queryKey: queryKeys.activeParseRun})
    }
  }, [runStatus])

  const parseMutation = useMutation({
    mutationFn: (resumeId: string) => profileApi.resumes.parseWorkExperience(resumeId),
    onSuccess: (data) => {
      setRunId(data.run_id)
      queryClient.invalidateQueries({queryKey: queryKeys.activeParseRun})
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => agentRunsApi.cancel(runId!),
    onSuccess: () => {
      setRunId(null)
      queryClient.invalidateQueries({queryKey: queryKeys.activeParseRun})
    },
  })

  const parsing = !!runId

  // Elapsed timer — driven from run's created_at so remount shows correct value
  useEffect(() => {
    if (parsing && runCreatedAt) {
      const startedAt = new Date(/[Z+]/.test(runCreatedAt) ? runCreatedAt : runCreatedAt + 'Z').getTime()
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    } else if (!parsing) {
      setElapsed(0)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [parsing, runCreatedAt])

  return {
    parsing,
    elapsed,
    lastSyncedAt,
    parse: parseMutation.mutate,
    cancel: cancelMutation.mutate,
  }
}
