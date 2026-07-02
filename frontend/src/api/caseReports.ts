import { apiClient } from './client'
import type { components } from './schema'

type ApiCaseReportListItem = components['schemas']['CaseReportListItem']
type ApiCaseReportListResponse = components['schemas']['CaseReportListResponse']
type ApiCaseReportDetailResponse =
  components['schemas']['CaseReportDetailResponse']

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

export type CaseReportRunner = {
  runnerId: string
  runnerName: string | null
  runnerOwner: string
  ip: string | null
}

export type CaseReportDetail = {
  caseReportId: string
  runner: CaseReportRunner
  runnerOwner: string
  caseId: string
  caseName: string
  module: string | null
  startedAt: string
  endedAt: string
  durationMs: number | null
  result: CaseResult
  errorType: string | null
  errorMessage: string | null
  reportUrl: string
  reportFilename: string
  reportContentType: string
  reportSizeBytes: number
  createdAt: string
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

function mapCaseReportDetail(
  detail: ApiCaseReportDetailResponse,
): CaseReportDetail {
  return {
    caseReportId: detail.case_report_id,
    runner: {
      runnerId: detail.runner.runner_id,
      runnerName: detail.runner.runner_name,
      runnerOwner: detail.runner.runner_owner,
      ip: detail.runner.ip,
    },
    runnerOwner: detail.runner_owner,
    caseId: detail.case_id,
    caseName: detail.case_name,
    module: detail.module,
    startedAt: detail.started_at,
    endedAt: detail.ended_at,
    durationMs: detail.duration_ms,
    result: detail.result,
    errorType: detail.error_type,
    errorMessage: detail.error_message,
    reportUrl: detail.report_url,
    reportFilename: detail.report_filename,
    reportContentType: detail.report_content_type,
    reportSizeBytes: detail.report_size_bytes,
    createdAt: detail.created_at,
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

export async function getCaseReportDetail(
  caseReportId: string,
): Promise<CaseReportDetail> {
  const { data, error } = await apiClient.GET(
    '/api/v1/case-reports/{case_report_id}',
    {
      params: {
        path: {
          case_report_id: caseReportId,
        },
      },
    },
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('用例报告详情响应为空')
  }

  return mapCaseReportDetail(data)
}
