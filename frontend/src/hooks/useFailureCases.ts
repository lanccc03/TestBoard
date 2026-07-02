import { useQuery } from '@tanstack/react-query'

import { getFailureCases, type FailureCasesQuery } from '@/api/failureCases'

export function useFailureCases(query: FailureCasesQuery) {
  return useQuery({
    queryKey: ['failure-cases', query],
    queryFn: () => getFailureCases(query),
  })
}
