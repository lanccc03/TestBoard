import { useQuery } from '@tanstack/react-query'

import { getCaseReports, type CaseReportsQuery } from '@/api/caseReports'

export function useCaseReports(query: CaseReportsQuery) {
  return useQuery({
    queryKey: ['case-reports', query],
    queryFn: () => getCaseReports(query),
  })
}
