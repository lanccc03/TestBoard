import { apiClient } from './client'
import type { components } from './schema'

type ApiStatsByDateResponse = components['schemas']['StatsByDateResponse']
type ApiStatsByOwnerResponse = components['schemas']['StatsByOwnerResponse']
type ApiStatsByRunnerResponse = components['schemas']['StatsByRunnerResponse']
type ApiStatsByCaseResponse = components['schemas']['StatsByCaseResponse']

type ApiStatsCounts = {
  total: number
  passed: number
  failed: number
  error: number
  skipped: number
  blocked: number
  failure_count: number
  pass_rate: number | null
}

export type StatsQuery = {
  startedAtFrom?: string
  startedAtTo?: string
  limit?: number
}

export type StatsRange = {
  startedAtFrom: string
  startedAtTo: string
}

export type StatsCounts = {
  total: number
  passed: number
  failed: number
  error: number
  skipped: number
  blocked: number
  failureCount: number
  passRate: number | null
}

export type StatsByDateItem = StatsCounts & {
  date: string
}

export type StatsByOwnerItem = StatsCounts & {
  runnerOwner: string
}

export type StatsByRunnerItem = StatsCounts & {
  runnerId: string
  runnerName: string | null
  runnerOwner: string
}

export type StatsByCaseItem = StatsCounts & {
  caseId: string
  caseName: string
  module: string | null
}

export type StatsByDateResponse = {
  generatedAt: string
  range: StatsRange
  items: StatsByDateItem[]
}

export type StatsByOwnerResponse = {
  generatedAt: string
  range: StatsRange
  items: StatsByOwnerItem[]
}

export type StatsByRunnerResponse = {
  generatedAt: string
  range: StatsRange
  items: StatsByRunnerItem[]
}

export type StatsByCaseResponse = {
  generatedAt: string
  range: StatsRange
  items: StatsByCaseItem[]
}

function mapRange(range: ApiStatsByDateResponse['range']): StatsRange {
  return {
    startedAtFrom: range.started_at_from,
    startedAtTo: range.started_at_to,
  }
}

function mapCounts(counts: ApiStatsCounts): StatsCounts {
  return {
    total: counts.total,
    passed: counts.passed,
    failed: counts.failed,
    error: counts.error,
    skipped: counts.skipped,
    blocked: counts.blocked,
    failureCount: counts.failure_count,
    passRate: counts.pass_rate,
  }
}

function statsTimeQuery(query: StatsQuery): {
  started_at_from?: string
  started_at_to?: string
} {
  const params: { started_at_from?: string; started_at_to?: string } = {}
  if (query.startedAtFrom !== undefined) {
    params.started_at_from = query.startedAtFrom
  }
  if (query.startedAtTo !== undefined) {
    params.started_at_to = query.startedAtTo
  }
  return params
}

function statsGroupQuery(query: StatsQuery): {
  started_at_from?: string
  started_at_to?: string
  limit?: number
} {
  const params: {
    started_at_from?: string
    started_at_to?: string
    limit?: number
  } = {}
  if (query.startedAtFrom !== undefined) {
    params.started_at_from = query.startedAtFrom
  }
  if (query.startedAtTo !== undefined) {
    params.started_at_to = query.startedAtTo
  }
  if (query.limit !== undefined) {
    params.limit = query.limit
  }
  return params
}

function mapDateResponse(
  response: ApiStatsByDateResponse,
): StatsByDateResponse {
  return {
    generatedAt: response.generated_at,
    range: mapRange(response.range),
    items: response.items.map((item) => ({
      date: item.date,
      ...mapCounts(item),
    })),
  }
}

function mapOwnerResponse(
  response: ApiStatsByOwnerResponse,
): StatsByOwnerResponse {
  return {
    generatedAt: response.generated_at,
    range: mapRange(response.range),
    items: response.items.map((item) => ({
      runnerOwner: item.runner_owner,
      ...mapCounts(item),
    })),
  }
}

function mapRunnerResponse(
  response: ApiStatsByRunnerResponse,
): StatsByRunnerResponse {
  return {
    generatedAt: response.generated_at,
    range: mapRange(response.range),
    items: response.items.map((item) => ({
      runnerId: item.runner_id,
      runnerName: item.runner_name,
      runnerOwner: item.runner_owner,
      ...mapCounts(item),
    })),
  }
}

function mapCaseResponse(
  response: ApiStatsByCaseResponse,
): StatsByCaseResponse {
  return {
    generatedAt: response.generated_at,
    range: mapRange(response.range),
    items: response.items.map((item) => ({
      caseId: item.case_id,
      caseName: item.case_name,
      module: item.module,
      ...mapCounts(item),
    })),
  }
}

export async function getStatsByDate(
  query: StatsQuery,
): Promise<StatsByDateResponse> {
  const { data, error } = await apiClient.GET('/api/v1/stats/by-date', {
    params: {
      query: statsTimeQuery(query),
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('日期趋势统计响应为空')
  }

  return mapDateResponse(data)
}

export async function getStatsByOwner(
  query: StatsQuery,
): Promise<StatsByOwnerResponse> {
  const { data, error } = await apiClient.GET('/api/v1/stats/by-owner', {
    params: {
      query: statsGroupQuery(query),
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Owner 统计响应为空')
  }

  return mapOwnerResponse(data)
}

export async function getStatsByRunner(
  query: StatsQuery,
): Promise<StatsByRunnerResponse> {
  const { data, error } = await apiClient.GET('/api/v1/stats/by-runner', {
    params: {
      query: statsGroupQuery(query),
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('执行机统计响应为空')
  }

  return mapRunnerResponse(data)
}

export async function getStatsByCase(
  query: StatsQuery,
): Promise<StatsByCaseResponse> {
  const { data, error } = await apiClient.GET('/api/v1/stats/by-case', {
    params: {
      query: statsGroupQuery(query),
    },
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('用例统计响应为空')
  }

  return mapCaseResponse(data)
}
