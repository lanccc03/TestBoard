import { useQuery } from '@tanstack/react-query'

import { getRuns, type RunsQuery } from '@/api/runs'

export function useRuns(query: RunsQuery) {
  return useQuery({
    queryKey: ['runs', query],
    queryFn: () => getRuns(query),
  })
}
