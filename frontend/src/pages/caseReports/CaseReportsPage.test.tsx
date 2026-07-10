import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CaseReportsQuery, CaseReportsResponse } from '@/api/caseReports'
import { useCaseReports } from '@/hooks/useCaseReports'

import { CaseReportsPage } from './CaseReportsPage'

vi.mock('@/hooks/useCaseReports', () => ({
  useCaseReports: vi.fn(),
}))

const mockUseCaseReports = vi.mocked(useCaseReports)

function caseReportsResponse(
  overrides: Partial<CaseReportsResponse> = {},
): CaseReportsResponse {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    ...overrides,
  }
}

function mockCaseReportsQuery(
  overrides: Partial<ReturnType<typeof useCaseReports>> = {},
) {
  const refetch = vi.fn()
  mockUseCaseReports.mockReturnValue({
    data: caseReportsResponse(),
    error: null,
    isError: false,
    isPending: false,
    refetch,
    ...overrides,
  } as ReturnType<typeof useCaseReports>)
  return { refetch }
}

function renderCaseReportsPage() {
  render(
    <MemoryRouter>
      <CaseReportsPage />
    </MemoryRouter>,
  )
}

describe('CaseReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loading state while fetching case reports', () => {
    mockCaseReportsQuery({ isPending: true, data: undefined })

    renderCaseReportsPage()

    expect(screen.getByText('加载用例报告')).toBeInTheDocument()
  })

  it('renders an empty state when no case reports match the query', () => {
    mockCaseReportsQuery()

    renderCaseReportsPage()

    expect(screen.getByText('暂无用例报告')).toBeInTheDocument()
    expect(
      screen.getByText('调整筛选条件或先上报用例报告。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置筛选' })).toBeInTheDocument()
  })

  it('renders an error state with retry', () => {
    const { refetch } = mockCaseReportsQuery({
      data: undefined,
      error: new Error('Network failed'),
      isError: true,
    })

    renderCaseReportsPage()

    expect(screen.getByText('Network failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders case report rows with detail and report links', () => {
    mockCaseReportsQuery({
      data: caseReportsResponse({
        items: [
          {
            caseReportId: 'aaaaaaaa-0000-0000-0000-000000000002',
            runnerId: 'runner-b',
            runnerOwner: 'bob',
            caseId: 'CASE-2',
            caseName: 'Checkout applies coupon',
            module: 'checkout',
            startedAt: '2026-06-30T02:00:00Z',
            endedAt: '2026-06-30T02:10:00Z',
            durationMs: 600000,
            result: 'failed',
            reportUrl:
              '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002/report',
            errorType: 'AssertionError',
            errorMessage: 'expected discount',
          },
          {
            caseReportId: 'aaaaaaaa-0000-0000-0000-000000000003',
            runnerId: 'runner-a',
            runnerOwner: 'alice',
            caseId: 'CASE-3',
            caseName: 'Login succeeds',
            module: null,
            startedAt: '2026-07-01T02:00:00Z',
            endedAt: '2026-07-01T02:10:00Z',
            durationMs: null,
            result: 'passed',
            reportUrl:
              '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000003/report',
            errorType: null,
            errorMessage: null,
          },
        ],
        total: 2,
        totalPages: 1,
      }),
    })

    renderCaseReportsPage()

    expect(screen.getByRole('region', { name: '执行记录' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '用例报告' })).toBeInTheDocument()
    const failedRow = screen.getByRole('row', {
      name: /Checkout applies coupon/,
    })
    expect(within(failedRow).getByText('CASE-2')).toBeInTheDocument()
    expect(within(failedRow).getByText('checkout')).toBeInTheDocument()
    expect(within(failedRow).getByText('runner-b')).toBeInTheDocument()
    expect(within(failedRow).getByText('bob')).toBeInTheDocument()
    expect(within(failedRow).getByText('失败')).toBeInTheDocument()
    expect(within(failedRow).getByText('AssertionError')).toBeInTheDocument()
    expect(
      within(failedRow).getByRole('link', { name: '报告' }),
    ).toHaveAttribute(
      'href',
      '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002/report',
    )
    expect(
      within(failedRow).getByRole('link', { name: '查看详情' }),
    ).toHaveAttribute(
      'href',
      '/case-reports/aaaaaaaa-0000-0000-0000-000000000002',
    )
    expect(screen.getAllByText('-')).toHaveLength(3)
  })

  it('submits filters and resets pagination to the first page', () => {
    mockCaseReportsQuery()
    renderCaseReportsPage()

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
    fireEvent.change(screen.getByLabelText('模块'), {
      target: { value: 'login' },
    })
    fireEvent.change(screen.getByLabelText('用例 ID 或名称'), {
      target: { value: 'CASE-1' },
    })
    fireEvent.click(screen.getByRole('combobox', { name: '结果' }))
    fireEvent.click(screen.getByRole('option', { name: '失败' }))
    fireEvent.click(screen.getByRole('button', { name: '筛选' }))

    expect(mockUseCaseReports).toHaveBeenLastCalledWith(
      expect.objectContaining<CaseReportsQuery>({
        page: 1,
        pageSize: 20,
        runnerOwner: 'alice',
        runnerId: 'runner-a',
        result: 'failed',
        module: 'login',
        query: 'CASE-1',
      }),
    )
  })

  it('moves between pages with pagination controls', () => {
    mockCaseReportsQuery({
      data: caseReportsResponse({
        items: [
          {
            caseReportId: 'aaaaaaaa-0000-0000-0000-000000000002',
            runnerId: 'runner-b',
            runnerOwner: 'bob',
            caseId: 'CASE-2',
            caseName: 'Checkout applies coupon',
            module: 'checkout',
            startedAt: '2026-06-30T02:00:00Z',
            endedAt: '2026-06-30T02:10:00Z',
            durationMs: 600000,
            result: 'failed',
            reportUrl:
              '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002/report',
            errorType: null,
            errorMessage: null,
          },
        ],
        total: 40,
        totalPages: 2,
      }),
    })
    renderCaseReportsPage()

    fireEvent.click(screen.getByRole('link', { name: '下一页' }))

    expect(mockUseCaseReports).toHaveBeenLastCalledWith(
      expect.objectContaining<CaseReportsQuery>({
        page: 2,
        pageSize: 20,
      }),
    )
  })
})
