import {useMutation, useQuery} from '@tanstack/react-query'
import {queryKeys} from '@/services/queryKeys'
import {opportunities as opApi} from '@/services/client'
import {queryClient} from '@/services/queryClient'

export function useOpportunities() {
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.opportunities,
    queryFn: () => opApi.list(),
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
