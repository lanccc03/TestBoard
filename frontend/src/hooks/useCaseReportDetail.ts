import { useQuery } from '@tanstack/react-query'

import { getCaseReportDetail } from '@/api/caseReports'

export function useCaseReportDetail(caseReportId: string | undefined) {
  return useQuery({
    queryKey: ['case-report-detail', caseReportId],
    queryFn: () => getCaseReportDetail(caseReportId ?? ''),
    enabled: Boolean(caseReportId),
  })
}
