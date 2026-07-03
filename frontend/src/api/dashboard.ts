import { apiClient } from './client'
import type { components } from './schema'

type ApiDashboardSummary = components['schemas']['DashboardSummaryResponse']
type ApiDashboardOwnerSummary = components['schemas']['DashboardOwnerSummary']
type ApiDashboardRecentRunner = components['schemas']['DashboardRecentRunner']
type ApiDashboardRecentFailure = components['schemas']['DashboardRecentFailure']

export type DashboardTodaySummary = {
  total: number
  passed: number
  failed: number
  passRate: number | null
}

export type DashboardOwnerSummary = {
  runnerOwner: string
  total: number
  passed: number
  failed: number
  passRate: number | null
}

export type DashboardRecentRunner = {
  runnerId: string
  runnerName: string | null
  runnerOwner: string
  ip: string | null
  lastResult: ApiDashboardRecentRunner['last_result']
  lastReportedAt: string
  caseReportId: string
  caseId: string
  caseName: string
}

export type DashboardRecentFailure = {
  caseReportId: string
  runnerId: string
  runnerOwner: string
  caseId: string
  caseName: string
  module: string | null
  startedAt: string
  endedAt: string
  durationMs: number | null
  result: ApiDashboardRecentFailure['result']
  errorType: string | null
  errorMessage: string | null
  reportUrl: string
}

export type DashboardSummary = {
  generatedAt: string
  todayStart: string
  todayEnd: string
  today: DashboardTodaySummary
  ownerSummaries: DashboardOwnerSummary[]
  recentRunners: DashboardRecentRunner[]
  recentFailures: DashboardRecentFailure[]
}

function mapOwnerSummary(
  summary: ApiDashboardOwnerSummary,
): DashboardOwnerSummary {
  return {
    runnerOwner: summary.runner_owner,
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    passRate: summary.pass_rate,
  }
}

function mapRecentRunner(
  runner: ApiDashboardRecentRunner,
): DashboardRecentRunner {
  return {
    runnerId: runner.runner_id,
    runnerName: runner.runner_name,
    runnerOwner: runner.runner_owner,
    ip: runner.ip,
    lastResult: runner.last_result,
    lastReportedAt: runner.last_reported_at,
    caseReportId: runner.case_report_id,
    caseId: runner.case_id,
    caseName: runner.case_name,
  }
}

function mapRecentFailure(
  failure: ApiDashboardRecentFailure,
): DashboardRecentFailure {
  return {
    caseReportId: failure.case_report_id,
    runnerId: failure.runner_id,
    runnerOwner: failure.runner_owner,
    caseId: failure.case_id,
    caseName: failure.case_name,
    module: failure.module,
    startedAt: failure.started_at,
    endedAt: failure.ended_at,
    durationMs: failure.duration_ms,
    result: failure.result,
    errorType: failure.error_type,
    errorMessage: failure.error_message,
    reportUrl: failure.report_url,
  }
}

function mapDashboardSummary(summary: ApiDashboardSummary): DashboardSummary {
  return {
    generatedAt: summary.generated_at,
    todayStart: summary.today_start,
    todayEnd: summary.today_end,
    today: {
      total: summary.today.total,
      passed: summary.today.passed,
      failed: summary.today.failed,
      passRate: summary.today.pass_rate,
    },
    ownerSummaries: summary.owner_summaries.map(mapOwnerSummary),
    recentRunners: summary.recent_runners.map(mapRecentRunner),
    recentFailures: summary.recent_failures.map(mapRecentFailure),
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await apiClient.GET('/api/v1/dashboard/summary')

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('首页看板响应为空')
  }

  return mapDashboardSummary(data)
}
