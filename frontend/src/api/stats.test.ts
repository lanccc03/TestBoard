import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from './client'
import {
  getStatsByCase,
  getStatsByDate,
  getStatsByOwner,
  getStatsByRunner,
} from './stats'

vi.mock('./client', () => ({
  apiClient: {
    GET: vi.fn(),
  },
}))

const mockGet = vi.mocked(apiClient.GET)

const statsRange = {
  started_at_from: '2026-07-01T00:00:00+08:00',
  started_at_to: '2026-07-08T00:00:00+08:00',
}

const statsCounts = {
  total: 3,
  passed: 1,
  failed: 1,
  error: 1,
  skipped: 0,
  blocked: 0,
  failure_count: 2,
  pass_rate: 1 / 3,
}

describe('stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests and maps date trend stats', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        generated_at: '2026-07-06T12:00:00+08:00',
        range: statsRange,
        items: [{ date: '2026-07-05', ...statsCounts }],
      },
      error: undefined,
      response: new Response(),
    })

    const response = await getStatsByDate({
      startedAtFrom: '2026-07-01T00:00:00+08:00',
      startedAtTo: '2026-07-08T00:00:00+08:00',
    })

    expect(mockGet).toHaveBeenCalledWith('/api/v1/stats/by-date', {
      params: {
        query: {
          started_at_from: '2026-07-01T00:00:00+08:00',
          started_at_to: '2026-07-08T00:00:00+08:00',
        },
      },
    })
    expect(response.items[0]).toEqual({
      date: '2026-07-05',
      total: 3,
      passed: 1,
      failed: 1,
      error: 1,
      skipped: 0,
      blocked: 0,
      failureCount: 2,
      passRate: 1 / 3,
    })
  })

  it('requests and maps owner, runner and case comparisons', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          generated_at: '2026-07-06T12:00:00+08:00',
          range: statsRange,
          items: [{ runner_owner: 'alice', ...statsCounts }],
        },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: {
          generated_at: '2026-07-06T12:00:00+08:00',
          range: statsRange,
          items: [
            {
              runner_id: 'runner-a',
              runner_name: 'Runner A',
              runner_owner: 'alice',
              ...statsCounts,
            },
          ],
        },
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: {
          generated_at: '2026-07-06T12:00:00+08:00',
          range: statsRange,
          items: [
            {
              case_id: 'CASE-1',
              case_name: 'Login succeeds',
              module: 'login',
              ...statsCounts,
            },
          ],
        },
        error: undefined,
        response: new Response(),
      })

    const ownerResponse = await getStatsByOwner({ limit: 10 })
    const runnerResponse = await getStatsByRunner({ limit: 10 })
    const caseResponse = await getStatsByCase({ limit: 10 })

    expect(mockGet).toHaveBeenNthCalledWith(1, '/api/v1/stats/by-owner', {
      params: { query: { limit: 10 } },
    })
    expect(ownerResponse.items[0].runnerOwner).toBe('alice')
    expect(runnerResponse.items[0]).toEqual(
      expect.objectContaining({
        runnerId: 'runner-a',
        runnerName: 'Runner A',
        runnerOwner: 'alice',
        failureCount: 2,
      }),
    )
    expect(caseResponse.items[0]).toEqual(
      expect.objectContaining({
        caseId: 'CASE-1',
        caseName: 'Login succeeds',
        module: 'login',
      }),
    )
  })

  it('throws API errors and empty response errors', async () => {
    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: { detail: 'Stats failed' } as never,
      response: new Response(),
    })

    await expect(getStatsByOwner({})).rejects.toEqual({
      detail: 'Stats failed',
    })

    mockGet.mockResolvedValueOnce({
      data: undefined,
      error: undefined,
      response: new Response(),
    })

    await expect(getStatsByDate({})).rejects.toThrow('日期趋势统计响应为空')
  })
})
