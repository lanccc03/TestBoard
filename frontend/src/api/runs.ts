import { apiClient } from './client'
import type { components } from './schema'

type ApiRunListItem = components['schemas']['RunListItem']
type ApiRunListResponse = components['schemas']['RunListResponse']

export type RunStatus = ApiRunListItem['status']

export type RunsQuery = {
  startedAtFrom?: string
  startedAtTo?: string
  runnerOwner?: string
  runnerId?: string
  status?: RunStatus
  page: number
  pageSize: number
}

export type RunListItem = {
  runId: string
  runnerId: string
  runnerOwner: string
  startedAt: string
  endedAt: string
  durationMs: number | null
  status: RunStatus
  totalCount: number
  failedCount: number
  passRate: number | null
  reportUrl: string | null
}

export type RunsResponse = {
  items: RunListItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function mapRunListItem(item: ApiRunListItem): RunListItem {
  return {
    runId: item.run_id,
    runnerId: item.runner_id,
    runnerOwner: item.runner_owner,
    startedAt: item.started_at,
    endedAt: item.ended_at,
    durationMs: item.duration_ms,
    status: item.status,
    totalCount: item.total_count,
    failedCount: item.failed_count,
    passRate: item.pass_rate,
    reportUrl: item.report_url,
  }
}

function mapRunsResponse(response: ApiRunListResponse): RunsResponse {
  return {
    items: response.items.map(mapRunListItem),
    page: response.page,
    pageSize: response.page_size,
    total: response.total,
    totalPages: response.total_pages,
  }
}

export async function getRuns(query: RunsQuery): Promise<RunsResponse> {
  const { data, error } = await apiClient.GET('/api/v1/runs', {
    params: {
      query: {
        started_at_from: query.startedAtFrom,
        started_at_to: query.startedAtTo,
        runner_owner: query.runnerOwner,
        runner_id: query.runnerId,
        status: query.status,
        page: query.page,
        page_size: query.pageSize,
      },
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('任务列表响应为空')
  }

  return mapRunsResponse(data)
}
