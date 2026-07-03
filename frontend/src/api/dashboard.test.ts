import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './client'
import { getDashboardSummary } from './dashboard'

vi.mock('./client', () => ({
  apiClient: {
    GET: vi.fn(),
  },
}))

const mockGet = vi.mocked(apiClient.GET)

describe('getDashboardSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests dashboard summary and maps response fields', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        generated_at: '2026-07-03T12:00:00+08:00',
        today_start: '2026-07-03T00:00:00+08:00',
        today_end: '2026-07-04T00:00:00+08:00',
        today: {
          total: 3,
          passed: 1,
          failed: 2,
          pass_rate: 1 / 3,
        },
        owner_summaries: [
          {
            runner_owner: 'alice',
            total: 2,
            passed: 1,
            failed: 1,
            pass_rate: 0.5,
          },
        ],
        recent_runners: [
          {
            runner_id: 'runner-a',
            runner_name: 'Runner A',
            runner_owner: 'alice',
            ip: '127.0.0.1',
            last_result: 'error',
            last_reported_at: '2026-07-03T03:00:00',
            case_report_id: 'aaaaaaaa-0000-0000-0000-000000000004',
            case_id: 'CASE-3',
            case_name: 'Search index refresh',
          },
        ],
        recent_failures: [
          {
            case_report_id: 'aaaaaaaa-0000-0000-0000-000000000004',
            runner_id: 'runner-a',
            runner_owner: 'alice',
            case_id: 'CASE-3',
            case_name: 'Search index refresh',
            module: 'search',
            started_at: '2026-07-03T03:00:00',
            ended_at: '2026-07-03T03:10:00',
            duration_ms: 600000,
            result: 'error',
            error_type: 'RuntimeError',
            error_message: 'timeout',
            report_url:
              '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000004/report',
          },
        ],
      },
      error: undefined,
      response: new Response(),
    })

    const response = await getDashboardSummary()

    expect(mockGet).toHaveBeenCalledWith('/api/v1/dashboard/summary')
    expect(response).toEqual({
      generatedAt: '2026-07-03T12:00:00+08:00',
      todayStart: '2026-07-03T00:00:00+08:00',
      todayEnd: '2026-07-04T00:00:00+08:00',
      today: {
        total: 3,
        passed: 1,
        failed: 2,
        passRate: 1 / 3,
      },
      ownerSummaries: [
        {
          runnerOwner: 'alice',
          total: 2,
          passed: 1,
          failed: 1,
          passRate: 0.5,
        },
      ],
      recentRunners: [
        {
          runnerId: 'runner-a',
          runnerName: 'Runner A',
          runnerOwner: 'alice',
          ip: '127.0.0.1',
          lastResult: 'error',
          lastReportedAt: '2026-07-03T03:00:00',
          caseReportId: 'aaaaaaaa-0000-0000-0000-000000000004',
          caseId: 'CASE-3',
          caseName: 'Search index refresh',
        },
      ],
      recentFailures: [
        {
          caseReportId: 'aaaaaaaa-0000-0000-0000-000000000004',
          runnerId: 'runner-a',
          runnerOwner: 'alice',
          caseId: 'CASE-3',
          caseName: 'Search index refresh',
          module: 'search',
          startedAt: '2026-07-03T03:00:00',
          endedAt: '2026-07-03T03:10:00',
          durationMs: 600000,
          result: 'error',
          errorType: 'RuntimeError',
          errorMessage: 'timeout',
          reportUrl:
            '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000004/report',
        },
      ],
    })
  })

  it('throws API errors', async () => {
    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: { detail: 'Dashboard failed' } as never,
      response: new Response(),
    })

    await expect(getDashboardSummary()).rejects.toEqual({
      detail: 'Dashboard failed',
    })
  })

  it('throws when the response body is empty', async () => {
    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: undefined,
      response: new Response(),
    })

    await expect(getDashboardSummary()).rejects.toThrow('首页看板响应为空')
  })
})
