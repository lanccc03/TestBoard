import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DashboardSummary } from '@/api/dashboard'
import { useDashboard } from '@/hooks/useDashboard'

import { DashboardPage } from './DashboardPage'

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}))

const mockUseDashboard = vi.mocked(useDashboard)

function dashboardSummary(
  overrides: Partial<DashboardSummary> = {},
): DashboardSummary {
  return {
    generatedAt: '2026-07-03T12:00:00+08:00',
    todayStart: '2026-07-03T00:00:00+08:00',
    todayEnd: '2026-07-04T00:00:00+08:00',
    today: {
      total: 0,
      passed: 0,
      failed: 0,
      passRate: null,
    },
    ownerSummaries: [],
    recentRunners: [],
    recentFailures: [],
    ...overrides,
  }
}

function mockDashboardQuery(
  overrides: Partial<ReturnType<typeof useDashboard>> = {},
) {
  const refetch = vi.fn()
  mockUseDashboard.mockReturnValue({
    data: dashboardSummary(),
    error: null,
    isError: false,
    isPending: false,
    refetch,
    ...overrides,
  } as ReturnType<typeof useDashboard>)
  return { refetch }
}

function renderDashboardPage() {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loading state while fetching dashboard data', () => {
    mockDashboardQuery({ isPending: true, data: undefined })

    renderDashboardPage()

    expect(screen.getByText('加载首页看板')).toBeInTheDocument()
  })

  it('renders an empty state when the dashboard has no reports', () => {
    mockDashboardQuery()

    renderDashboardPage()

    expect(screen.getByText('暂无看板数据')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看用例报告' })).toHaveAttribute(
      'href',
      '/case-reports',
    )
  })

  it('renders an error state with retry', () => {
    const { refetch } = mockDashboardQuery({
      data: undefined,
      error: new Error('Network failed'),
      isError: true,
    })

    renderDashboardPage()

    expect(screen.getByText('Network failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders metrics and linked dashboard tables', () => {
    mockDashboardQuery({
      data: dashboardSummary({
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
      }),
    })

    renderDashboardPage()

    expect(
      screen.getByRole('heading', { name: '首页看板' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('article', { name: '今日报告总数' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('article', { name: '今日通过率' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Owner 今日概览' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: '最近执行机' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: '最近失败用例' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/统计窗口：/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('33.3%')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看全部报告' })).toHaveAttribute(
      'href',
      '/case-reports',
    )
    expect(screen.getByRole('link', { name: '查看失败用例' })).toHaveAttribute(
      'href',
      '/failures',
    )

    const ownerTable = screen.getByRole('table', { name: 'Owner 今日概览' })
    const ownerRow = within(ownerTable).getByRole('row', { name: /alice/ })
    expect(within(ownerRow).getByText('50.0%')).toBeInTheDocument()

    const runnerTable = screen.getByRole('table', { name: '最近执行机' })
    const runnerRow = within(runnerTable).getByRole('row', { name: /Runner A/ })
    expect(within(runnerRow).getByText('runner-a')).toBeInTheDocument()
    expect(within(runnerRow).getByText('异常')).toBeInTheDocument()

    const failureTable = screen.getByRole('table', { name: '最近失败用例' })
    const failureRow = within(failureTable).getByRole('row', {
      name: /Search index refresh/,
    })
    expect(within(failureRow).getByText('CASE-3')).toBeInTheDocument()
    expect(within(failureRow).getByText('RuntimeError')).toBeInTheDocument()
    expect(
      within(failureRow).getByRole('link', { name: '报告' }),
    ).toHaveAttribute(
      'href',
      '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000004/report',
    )
    expect(
      within(failureRow).getByRole('link', { name: '查看详情' }),
    ).toHaveAttribute(
      'href',
      '/case-reports/aaaaaaaa-0000-0000-0000-000000000004',
    )
  })
})
