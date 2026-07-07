import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  StatsByCaseResponse,
  StatsByDateResponse,
  StatsByOwnerResponse,
  StatsByRunnerResponse,
} from '@/api/stats'
import { useStats } from '@/hooks/useStats'

import { StatsPage } from './StatsPage'

vi.mock('recharts', () => {
  function ChartContainer({ children }: { children: React.ReactNode }) {
    return <div data-testid="chart">{children}</div>
  }

  function ChartElement({ children }: { children?: React.ReactNode }) {
    return <div>{children}</div>
  }

  return {
    Bar: ChartElement,
    BarChart: ChartContainer,
    CartesianGrid: ChartElement,
    ComposedChart: ChartContainer,
    Legend: ChartElement,
    Line: ChartElement,
    ResponsiveContainer: ChartElement,
    Tooltip: ChartElement,
    XAxis: ChartElement,
    YAxis: ChartElement,
  }
})

vi.mock('@/hooks/useStats', () => ({
  useStats: vi.fn(),
}))

const mockUseStats = vi.mocked(useStats)

const statsRange = {
  startedAtFrom: '2026-07-01T00:00:00+08:00',
  startedAtTo: '2026-07-08T00:00:00+08:00',
}

const statsCounts = {
  total: 3,
  passed: 1,
  failed: 1,
  error: 1,
  skipped: 0,
  blocked: 0,
  failureCount: 2,
  passRate: 1 / 3,
}

function byDateResponse(
  overrides: Partial<StatsByDateResponse> = {},
): StatsByDateResponse {
  return {
    generatedAt: '2026-07-06T12:00:00+08:00',
    range: statsRange,
    items: [{ date: '2026-07-05', ...statsCounts }],
    ...overrides,
  }
}

function byOwnerResponse(
  overrides: Partial<StatsByOwnerResponse> = {},
): StatsByOwnerResponse {
  return {
    generatedAt: '2026-07-06T12:00:00+08:00',
    range: statsRange,
    items: [{ runnerOwner: 'alice', ...statsCounts }],
    ...overrides,
  }
}

function byRunnerResponse(
  overrides: Partial<StatsByRunnerResponse> = {},
): StatsByRunnerResponse {
  return {
    generatedAt: '2026-07-06T12:00:00+08:00',
    range: statsRange,
    items: [
      {
        runnerId: 'runner-a',
        runnerName: 'Runner A',
        runnerOwner: 'alice',
        ...statsCounts,
      },
    ],
    ...overrides,
  }
}

function byCaseResponse(
  overrides: Partial<StatsByCaseResponse> = {},
): StatsByCaseResponse {
  return {
    generatedAt: '2026-07-06T12:00:00+08:00',
    range: statsRange,
    items: [
      {
        caseId: 'CASE-1',
        caseName: 'Login succeeds',
        module: 'login',
        ...statsCounts,
      },
    ],
    ...overrides,
  }
}

function mockStats(overrides: Partial<ReturnType<typeof useStats>> = {}) {
  const refetch = vi.fn()
  mockUseStats.mockReturnValue({
    byDate: {
      data: byDateResponse(),
      error: null,
      isError: false,
      isPending: false,
      refetch,
    },
    byOwner: {
      data: byOwnerResponse(),
      error: null,
      isError: false,
      isPending: false,
      refetch,
    },
    byRunner: {
      data: byRunnerResponse(),
      error: null,
      isError: false,
      isPending: false,
      refetch,
    },
    byCase: {
      data: byCaseResponse(),
      error: null,
      isError: false,
      isPending: false,
      refetch,
    },
    ...overrides,
  } as unknown as ReturnType<typeof useStats>)
  return { refetch }
}

function renderStatsPage() {
  render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
  )
}

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state while stats are fetching', () => {
    mockStats({
      byDate: {
        data: undefined,
        error: null,
        isError: false,
        isPending: true,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byDate'],
    })

    renderStatsPage()

    expect(screen.getByText('加载统计数据')).toBeInTheDocument()
  })

  it('renders an error state with retry', () => {
    const refetch = vi.fn()
    mockStats({
      byOwner: {
        data: undefined,
        error: new Error('Stats failed'),
        isError: true,
        isPending: false,
        refetch,
      } as unknown as ReturnType<typeof useStats>['byOwner'],
    })

    renderStatsPage()

    expect(screen.getByText('Stats failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders an empty state when all stats are empty', () => {
    mockStats({
      byDate: {
        data: byDateResponse({
          items: [{ date: '2026-07-05', ...statsCounts, total: 0 }],
        }),
        error: null,
        isError: false,
        isPending: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byDate'],
      byOwner: {
        data: byOwnerResponse({ items: [] }),
        error: null,
        isError: false,
        isPending: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byOwner'],
      byRunner: {
        data: byRunnerResponse({ items: [] }),
        error: null,
        isError: false,
        isPending: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byRunner'],
      byCase: {
        data: byCaseResponse({ items: [] }),
        error: null,
        isError: false,
        isPending: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byCase'],
    })

    renderStatsPage()

    expect(screen.getByText('暂无统计数据')).toBeInTheDocument()
  })

  it('renders charts and comparison tables', () => {
    mockStats()

    renderStatsPage()

    expect(
      screen.getByRole('heading', { name: '统计趋势' }),
    ).toBeInTheDocument()
    const summary = screen.getByLabelText('统计概览')
    expect(within(summary).getByText('报告总数')).toBeInTheDocument()
    expect(within(summary).getByText('3 条')).toBeInTheDocument()
    expect(within(summary).getByText('失败风险')).toBeInTheDocument()
    expect(within(summary).getByText('2 条')).toBeInTheDocument()
    expect(within(summary).getByText('通过率')).toBeInTheDocument()
    expect(within(summary).getByText('33.3%')).toBeInTheDocument()
    expect(within(summary).getByText('阻塞 / 异常')).toBeInTheDocument()
    expect(within(summary).getByText('1 条')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart')).toHaveLength(4)
    expect(screen.getByText('2026-07-05')).toBeInTheDocument()
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0)
    expect(screen.getByText('Runner A')).toBeInTheDocument()
    expect(screen.getByText('CASE-1')).toBeInTheDocument()
    expect(screen.getAllByText('33.3%').length).toBeGreaterThan(0)

    const ownerTable = screen.getByRole('table', { name: 'Owner 统计对比' })
    const ownerRow = within(ownerTable).getByRole('row', { name: /alice/ })
    expect(within(ownerRow).getByText('2 条')).toBeInTheDocument()
  })

  it('excludes skipped and blocked outcomes from summary pass rate', () => {
    mockStats({
      byDate: {
        data: byDateResponse({
          items: [
            {
              date: '2026-07-05',
              ...statsCounts,
              total: 5,
              passed: 1,
              failed: 1,
              error: 0,
              skipped: 2,
              blocked: 1,
              failureCount: 1,
              passRate: 0.2,
            },
          ],
        }),
        error: null,
        isError: false,
        isPending: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byDate'],
    })

    renderStatsPage()

    const summary = screen.getByLabelText('统计概览')
    expect(within(summary).getByText('通过率')).toBeInTheDocument()
    expect(within(summary).getByText('50.0%')).toBeInTheDocument()
  })

  it('hides summary metrics when any stats query fails', () => {
    mockStats({
      byOwner: {
        data: undefined,
        error: new Error('Owner stats failed'),
        isError: true,
        isPending: false,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useStats>['byOwner'],
    })

    renderStatsPage()

    expect(screen.getByText('Owner stats failed')).toBeInTheDocument()
    expect(screen.queryByLabelText('统计概览')).not.toBeInTheDocument()
    expect(screen.queryByText(/统计窗口：/)).not.toBeInTheDocument()
  })

  it('submits and resets the time range filters', () => {
    mockStats()
    renderStatsPage()

    fireEvent.change(screen.getByLabelText('开始时间'), {
      target: { value: '2026-07-01T00:00' },
    })
    fireEvent.change(screen.getByLabelText('结束时间'), {
      target: { value: '2026-07-08T00:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: '筛选' }))

    expect(mockUseStats).toHaveBeenLastCalledWith({
      startedAtFrom: '2026-07-01T00:00',
      startedAtTo: '2026-07-08T00:00',
      limit: 10,
    })

    fireEvent.click(screen.getByRole('button', { name: '重置' }))

    expect(mockUseStats).toHaveBeenLastCalledWith({
      limit: 10,
    })
  })
})
