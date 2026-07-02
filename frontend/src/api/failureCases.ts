import { apiClient } from './client'
import type { components } from './schema'

type ApiFailureCaseListItem = components['schemas']['FailureCaseListItem']
type ApiFailureCaseListResponse =
  components['schemas']['FailureCaseListResponse']

export type FailureCaseResult = ApiFailureCaseListItem['result']

export type FailureCasesQuery = {
  startedAtFrom?: string
  startedAtTo?: string
  runnerOwner?: string
  runnerId?: string
  module?: string
  caseId?: string
  page: number
  pageSize: number
}

export type FailureCaseItem = {
  caseReportId: string
  runnerId: string
  runnerOwner: string
  caseId: string
  caseName: string
  module: string | null
  startedAt: string
  endedAt: string
  durationMs: number | null
  result: FailureCaseResult
  errorType: string | null
  errorMessage: string | null
  reportUrl: string
}

export type FailureCasesResponse = {
  items: FailureCaseItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function mapFailureCaseListItem(item: ApiFailureCaseListItem): FailureCaseItem {
  return {
    caseReportId: item.case_report_id,
    runnerId: item.runner_id,
    runnerOwner: item.runner_owner,
    caseId: item.case_id,
    caseName: item.case_name,
    module: item.module,
    startedAt: item.started_at,
    endedAt: item.ended_at,
    durationMs: item.duration_ms,
    result: item.result,
    errorType: item.error_type,
    errorMessage: item.error_message,
    reportUrl: item.report_url,
  }
}

function mapFailureCasesResponse(
  response: ApiFailureCaseListResponse,
): FailureCasesResponse {
  return {
    items: response.items.map(mapFailureCaseListItem),
    page: response.page,
    pageSize: response.page_size,
    total: response.total,
    totalPages: response.total_pages,
  }
}

export async function getFailureCases(
  query: FailureCasesQuery,
): Promise<FailureCasesResponse> {
  const { data, error } = await apiClient.GET('/api/v1/cases/failures', {
    params: {
      query: {
        started_at_from: query.startedAtFrom,
        started_at_to: query.startedAtTo,
        runner_owner: query.runnerOwner,
        runner_id: query.runnerId,
        module: query.module,
        case_id: query.caseId,
        page: query.page,
        page_size: query.pageSize,
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('失败用例列表响应为空')
  }

  return mapFailureCasesResponse(data)
}
