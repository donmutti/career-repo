import {useEffect, useRef, useState} from 'react'
import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {opportunities as opApi, attachments as attachApi, agentRuns as agentRunsApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {Opportunity, OpportunitySimilarity} from '@/app/opportunities/OpportunityTypes'

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled']

interface UseOpportunityOptions {
  onDeleted?: () => void
  onAbsorbed?: (neighborId: string) => void
}

export function useOpportunity(opportunityId: string, options: UseOpportunityOptions = {}) {

  const [isSourcing, setIsSourcing] = useState(false)
  const [coverLetterRunId, setCoverLetterRunId] = useState<string | null>(null)

  const {data: opp, isLoading} = useQuery({
    queryKey: queryKeys.opportunity(opportunityId),
    queryFn: () => opApi.get(opportunityId),
    refetchInterval: (query) => {
      const o = query.state.data as Opportunity | undefined
      if (isSourcing) return 2000
      return o?.sourcing_started_at && !o?.sourcing_completed_at ? 2000 : false
    },
  })

  const {data: comments} = useQuery({
    queryKey: queryKeys.opportunityComments(opportunityId),
    queryFn: () => opApi.comments(opportunityId),
  })

  const {data: attachments} = useQuery({
    queryKey: queryKeys.opportunityAttachments(opportunityId),
    queryFn: () => opApi.attachments(opportunityId),
  })

  // On mount, recover any in-progress cover letter run from the server
  const {data: activeCoverLetterRunData} = useQuery({
    queryKey: queryKeys.activeCoverLetterRun(opportunityId),
    queryFn: () => opApi.activeCoverLetterRun(opportunityId),
    staleTime: 0,
  })
  useEffect(() => {
    if (activeCoverLetterRunData?.run_id && !coverLetterRunId) {
      setCoverLetterRunId(activeCoverLetterRunData.run_id)
    }
  }, [activeCoverLetterRunData?.run_id])

  const {data: coverLetterRunData} = useQuery({
    queryKey: ['opportunities', opportunityId, 'cover-letter-run', coverLetterRunId],
    queryFn: () => agentRunsApi.get(coverLetterRunId!),
    enabled: !!coverLetterRunId,
    refetchInterval: 2000,
  })
  const coverLetterRunStatus = (coverLetterRunData as {status?: string} | undefined)?.status
  const coverLetterRunCreatedAt = (coverLetterRunData as {created_at?: string} | undefined)?.created_at

  useEffect(() => {
    if (coverLetterRunStatus && TERMINAL_STATUSES.includes(coverLetterRunStatus)) {
      setCoverLetterRunId(null)
      queryClient.invalidateQueries({queryKey: queryKeys.opportunityAttachments(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.activeCoverLetterRun(opportunityId)})
    }
  }, [coverLetterRunStatus, opportunityId])

  const {data: similarData} = useQuery({
    queryKey: queryKeys.opportunitySimilar(opportunityId),
    queryFn: () => opApi.similar(opportunityId),
  })
  const similarOpportunities = (similarData as OpportunitySimilarity[] | undefined) ?? []

  const opportunity = opp as Opportunity | undefined
  const isServerSourcing = !!(opportunity?.sourcing_started_at && !opportunity?.sourcing_completed_at)
  const isChanging = isSourcing || isServerSourcing

  useEffect(() => {
    if (isServerSourcing) setIsSourcing(false)
  }, [isServerSourcing])

  const prevHasActiveRunRef = useRef(false)
  useEffect(() => {
    if (prevHasActiveRunRef.current && !isChanging) {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunityAttachments(opportunityId)})
    }
    prevHasActiveRunRef.current = isChanging
  }, [isChanging, opportunityId])

  const sourceMutation = useMutation({
    mutationFn: () => opApi.source(opportunityId),
    onMutate: () => setIsSourcing(true),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunityAgentRuns(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
    },
    onError: () => setIsSourcing(false),
  })

  const patchMutation = useMutation({
    mutationFn: (data: unknown) => opApi.patch(opportunityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunityComments(opportunityId)})
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (body: string) => opApi.addComment(opportunityId, {body}),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.opportunityComments(opportunityId)}),
  })

  const updateCommentMutation = useMutation({
    mutationFn: ({id, body}: { id: string; body: string }) => opApi.updateComment(id, {body}),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.opportunityComments(opportunityId)}),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) => opApi.deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.opportunityComments(opportunityId)}),
  })

  const coverLetterMutation = useMutation({
    mutationFn: () => opApi.generateCoverLetter(opportunityId),
    onSuccess: (data) => {
      setCoverLetterRunId(data.run_id)
      queryClient.invalidateQueries({queryKey: queryKeys.activeCoverLetterRun(opportunityId)})
    },
  })

  const cancelCoverLetterMutation = useMutation({
    mutationFn: () => agentRunsApi.cancel(coverLetterRunId!),
    onSuccess: () => {
      setCoverLetterRunId(null)
      queryClient.invalidateQueries({queryKey: queryKeys.activeCoverLetterRun(opportunityId)})
    },
  })

  const cancelEvaluationMutation = useMutation({
    mutationFn: (runId: string) => agentRunsApi.cancel(runId),
    onSuccess: () => {
      setIsSourcing(false)
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
    },
    onError: () => {
      setIsSourcing(false)
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
    },
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (id: string) => attachApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.opportunityAttachments(opportunityId)}),
  })

  const deleteMutation = useMutation({
    mutationFn: () => opApi.delete(opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      options.onDeleted?.()
    },
  })

  const setCompensationMutation = useMutation({
    mutationFn: (data: {job_pay_min: number | null; job_pay_max: number | null; job_pay_currency: string | null; job_pay_period: string | null}) => opApi.setCompensation(opportunityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
    },
  })

  const setUrlMutation = useMutation({
    mutationFn: (url: string) => opApi.setUrl(opportunityId, url),
    onSuccess: (_data, url) => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunity(opportunityId)})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      if (url && url !== opportunity?.url) sourceMutation.mutate()
    },
  })

  const dismissSimilarMutation = useMutation({
    mutationFn: (neighborId: string) => opApi.dismissSimilar(opportunityId, neighborId),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.opportunitySimilar(opportunityId)}),
  })

  const absorbMutation = useMutation({
    mutationFn: (neighborId: string) => opApi.absorb(opportunityId, neighborId),
    onSuccess: (_, neighborId) => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      queryClient.invalidateQueries({queryKey: queryKeys.opportunitySimilar(opportunityId)})
      queryClient.getQueryCache().findAll({queryKey: ['opportunities']}).forEach(query => {
        if (query.queryKey.length === 3 && query.queryKey[2] === 'similar') {
          queryClient.invalidateQueries({queryKey: query.queryKey})
        }
      })
      options.onAbsorbed?.(neighborId)
    },
  })

  // "Merge into": current opp is the duplicate, canonicalId is the target
  const mergeIntoMutation = useMutation({
    mutationFn: (canonicalId: string) => opApi.absorb(canonicalId, opportunityId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
      queryClient.getQueryCache().findAll({queryKey: ['opportunities']}).forEach(query => {
        if (query.queryKey.length === 3 && query.queryKey[2] === 'similar') {
          queryClient.invalidateQueries({queryKey: query.queryKey})
        }
      })
    },
  })

  return {
    opportunity,
    isLoading,
    comments,
    attachments,
    isChanging,
    source: sourceMutation.mutate,
    isSourcing: sourceMutation.isPending,
    patch: patchMutation.mutate,
    addComment: addCommentMutation.mutate,
    updateComment: updateCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    generateCoverLetter: coverLetterMutation.mutate,
    isGeneratingCoverLetter: !!coverLetterRunId,
    coverLetterRunCreatedAt,
    cancelCoverLetter: cancelCoverLetterMutation.mutate,
    cancelEvaluation: cancelEvaluationMutation.mutate,
    deleteAttachment: deleteAttachmentMutation.mutate,
    deleteOpportunity: deleteMutation.mutate,
    isDeletingOpportunity: deleteMutation.isPending,
    setCompensation: setCompensationMutation.mutate,
    setUrl: setUrlMutation.mutate,
    isSettingUrl: setUrlMutation.isPending,
    similarOpportunities,
    dismissSimilar: dismissSimilarMutation.mutate,
    absorb: absorbMutation.mutate,
    isAbsorbing: absorbMutation.isPending,
    mergeInto: mergeIntoMutation.mutate,
    isMergingInto: mergeIntoMutation.isPending,
  }
}
