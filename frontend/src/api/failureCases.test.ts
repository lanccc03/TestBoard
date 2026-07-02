import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './client'
import { getFailureCases } from './failureCases'

vi.mock('./client', () => ({
  apiClient: {
    GET: vi.fn(),
  },
}))

const mockGet = vi.mocked(apiClient.GET)

describe('getFailureCases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests failure cases with filters and maps response fields', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        items: [
          {
            case_report_id: 'aaaaaaaa-0000-0000-0000-000000000003',
            runner_id: 'runner-a',
            runner_owner: 'alice',
            case_id: 'CASE-3',
            case_name: 'Search index refresh',
            module: 'search',
            started_at: '2026-06-30T02:00:00Z',
            ended_at: '2026-06-30T02:10:00Z',
            duration_ms: 600000,
            result: 'error',
            error_type: 'RuntimeError',
            error_message: 'timeout',
            report_url:
              '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000003/report',
          },
        ],
        page: 2,
        page_size: 20,
        total: 21,
        total_pages: 2,
      },
      error: undefined,
      response: new Response(),
    })

    const response = await getFailureCases({
      startedAtFrom: '2026-06-30T00:00:00.000Z',
      startedAtTo: '2026-06-30T23:59:59.000Z',
      runnerOwner: 'alice',
      runnerId: 'runner-a',
      module: 'search',
      caseId: 'CASE-3',
      page: 2,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/cases/failures', {
      params: {
        query: {
          started_at_from: '2026-06-30T00:00:00.000Z',
          started_at_to: '2026-06-30T23:59:59.000Z',
          runner_owner: 'alice',
          runner_id: 'runner-a',
          module: 'search',
          case_id: 'CASE-3',
          page: 2,
          page_size: 20,
        },
      },
    })
    expect(response).toEqual({
      items: [
        {
          caseReportId: 'aaaaaaaa-0000-0000-0000-000000000003',
          runnerId: 'runner-a',
          runnerOwner: 'alice',
          caseId: 'CASE-3',
          caseName: 'Search index refresh',
          module: 'search',
          startedAt: '2026-06-30T02:00:00Z',
          endedAt: '2026-06-30T02:10:00Z',
          durationMs: 600000,
          result: 'error',
          errorType: 'RuntimeError',
          errorMessage: 'timeout',
          reportUrl:
            '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000003/report',
        },
      ],
      page: 2,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    })
  })

  it('throws API errors', async () => {
    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: { detail: 'Invalid filters' } as never,
      response: new Response(),
    })

    await expect(
      getFailureCases({
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toEqual({ detail: 'Invalid filters' })
  })

  it('throws when the response body is empty', async () => {
    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: undefined,
      response: new Response(),
    })

    await expect(
      getFailureCases({
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toThrow('失败用例列表响应为空')
  })
})
