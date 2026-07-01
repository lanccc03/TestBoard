import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RunsQuery, RunsResponse } from '@/api/runs'
import { useRuns } from '@/hooks/useRuns'

import { RunsPage } from './RunsPage'

vi.mock('@/hooks/useRuns', () => ({
  useRuns: vi.fn(),
}))

const mockUseRuns = vi.mocked(useRuns)

function runsResponse(overrides: Partial<RunsResponse> = {}): RunsResponse {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    ...overrides,
  }
}

function mockRunsQuery(overrides: Partial<ReturnType<typeof useRuns>> = {}) {
  const refetch = vi.fn()
  mockUseRuns.mockReturnValue({
    data: runsResponse(),
    error: null,
    isError: false,
    isPending: false,
    refetch,
    ...overrides,
  } as ReturnType<typeof useRuns>)
  return { refetch }
}

function renderRunsPage() {
  render(
    <MemoryRouter>
      <RunsPage />
    </MemoryRouter>,
  )
}

describe('RunsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loading state while fetching runs', () => {
    mockRunsQuery({ isPending: true, data: undefined })

    renderRunsPage()

    expect(screen.getByText('加载任务列表')).toBeInTheDocument()
  })

  it('renders an empty state when no runs match the query', () => {
    mockRunsQuery()

    renderRunsPage()

    expect(screen.getByText('暂无任务')).toBeInTheDocument()
    expect(
      screen.getByText('调整筛选条件或先上报测试结果。'),
    ).toBeInTheDocument()
  })

  it('renders an error state with retry', () => {
    const { refetch } = mockRunsQuery({
      data: undefined,
      error: new Error('Network failed'),
      isError: true,
    })

    renderRunsPage()

    expect(screen.getByText('Network failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders run rows with detail and report links', () => {
    mockRunsQuery({
      data: runsResponse({
        items: [
          {
            runId: 'aaaaaaaa-0000-0000-0000-000000000002',
            runnerId: 'runner-b',
            runnerOwner: 'bob',
            startedAt: '2026-06-30T02:00:00Z',
            endedAt: '2026-06-30T02:10:00Z',
            durationMs: 600000,
            status: 'failed',
            totalCount: 10,
            failedCount: 1,
            passRate: 0.8,
            reportUrl: 'https://example.com/report',
          },
          {
            runId: 'aaaaaaaa-0000-0000-0000-000000000003',
            runnerId: 'runner-a',
            runnerOwner: 'alice',
            startedAt: '2026-07-01T02:00:00Z',
            endedAt: '2026-07-01T02:10:00Z',
            durationMs: null,
            status: 'passed',
            totalCount: 3,
            failedCount: 0,
            passRate: null,
            reportUrl: null,
          },
        ],
        total: 2,
        totalPages: 1,
      }),
    })

    renderRunsPage()

    const runnerRow = screen.getByRole('row', { name: /runner-b/ })
    expect(within(runnerRow).getByText('bob')).toBeInTheDocument()
    expect(within(runnerRow).getByText('失败')).toBeInTheDocument()
    expect(within(runnerRow).getByText('80%')).toBeInTheDocument()
    expect(
      within(runnerRow).getByRole('link', { name: '报告' }),
    ).toHaveAttribute('href', 'https://example.com/report')
    expect(
      within(runnerRow).getByRole('link', { name: '查看详情' }),
    ).toHaveAttribute('href', '/runs/aaaaaaaa-0000-0000-0000-000000000002')
    expect(screen.getAllByText('-')).toHaveLength(3)
  })

  it('submits filters and resets pagination to the first page', () => {
    mockRunsQuery()
    renderRunsPage()

    fireEvent.change(screen.getByLabelText('开始时间'), {
      target: { value: '2026-06-30T10:00' },
    })
    fireEvent.change(screen.getByLabelText('结束时间'), {
      target: { value: '2026-06-30T18:00' },
    })
    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: 'alice' },
    })
    fireEvent.change(screen.getByLabelText('执行机'), {
      target: { value: 'runner-a' },
    })
    fireEvent.click(screen.getByRole('combobox', { name: '任务状态' }))
    fireEvent.click(screen.getByRole('option', { name: '失败' }))
    fireEvent.click(screen.getByRole('button', { name: '筛选' }))

    expect(mockUseRuns).toHaveBeenLastCalledWith(
      expect.objectContaining<RunsQuery>({
        page: 1,
        pageSize: 20,
        runnerOwner: 'alice',
        runnerId: 'runner-a',
        status: 'failed',
      }),
    )
  })

  it('moves between pages with pagination controls', () => {
    mockRunsQuery({
      data: runsResponse({
        items: [
          {
            runId: 'aaaaaaaa-0000-0000-0000-000000000002',
            runnerId: 'runner-b',
            runnerOwner: 'bob',
            startedAt: '2026-06-30T02:00:00Z',
            endedAt: '2026-06-30T02:10:00Z',
            durationMs: 600000,
            status: 'failed',
            totalCount: 10,
            failedCount: 1,
            passRate: 0.8,
            reportUrl: null,
          },
        ],
        total: 40,
        totalPages: 2,
      }),
    })
    renderRunsPage()

    fireEvent.click(screen.getByRole('link', { name: '下一页' }))

    expect(mockUseRuns).toHaveBeenLastCalledWith(
      expect.objectContaining<RunsQuery>({
        page: 2,
        pageSize: 20,
      }),
    )
  })
})
