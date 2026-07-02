import { apiClient } from './client'
import type { components } from './schema'

type ApiCaseReportListItem = components['schemas']['CaseReportListItem']
type ApiCaseReportListResponse = components['schemas']['CaseReportListResponse']

export type CaseResult = ApiCaseReportListItem['result']

export type CaseReportsQuery = {
  startedAtFrom?: string
  startedAtTo?: string
  runnerOwner?: string
  runnerId?: string
  result?: CaseResult
  module?: string
  query?: string
  page: number
  pageSize: number
}

export type CaseReportListItem = {
  caseReportId: string
  runnerId: string
  runnerOwner: string
  caseId: string
  caseName: string
  module: string | null
  startedAt: string
  endedAt: string
  durationMs: number | null
  result: CaseResult
  reportUrl: string
  errorType: string | null
  errorMessage: string | null
}

export type CaseReportsResponse = {
  items: CaseReportListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function mapCaseReportListItem(
  item: ApiCaseReportListItem,
): CaseReportListItem {
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
    reportUrl: item.report_url,
    errorType: item.error_type,
    errorMessage: item.error_message,
  }
}

function mapCaseReportsResponse(
  response: ApiCaseReportListResponse,
): CaseReportsResponse {
  return {
    items: response.items.map(mapCaseReportListItem),
    page: response.page,
    pageSize: response.page_size,
    total: response.total,
    totalPages: response.total_pages,
  }
}

export async function getCaseReports(
  query: CaseReportsQuery,
): Promise<CaseReportsResponse> {
  const { data, error } = await apiClient.GET('/api/v1/case-reports', {
    params: {
      query: {
        started_at_from: query.startedAtFrom,
        started_at_to: query.startedAtTo,
        runner_owner: query.runnerOwner,
        runner_id: query.runnerId,
        result: query.result,
        module: query.module,
        query: query.query,
        page: query.page,
        page_size: query.pageSize,
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('用例报告列表响应为空')
  }

  return mapCaseReportsResponse(data)
}
