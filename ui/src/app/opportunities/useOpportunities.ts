import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {opportunities as opApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'
import {ApiOpportunity} from '@/app/opportunities/OpportunityTypes'

export function useOpportunities() {
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.opportunities,
    queryFn: () => opApi.list(),
    refetchInterval: (query) => {
      const list = (query.state.data as ApiOpportunity[] | undefined) ?? []
      const anySourcing = list.some(o => o.sourcing_started_at != null && o.sourcing_completed_at == null)
      return anySourcing ? 2000 : false
    },
  })

  const createMutation = useMutation({
    mutationFn: (url: string) => opApi.create({url}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.opportunities})
    },
  })

  const opportunities = (data as ApiOpportunity[]) ?? []

  return {opportunities, isLoading, createMutation}
}
