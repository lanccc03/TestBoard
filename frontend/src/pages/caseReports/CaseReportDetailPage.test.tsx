import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CaseReportDetail } from '@/api/caseReports'
import { useCaseReportDetail } from '@/hooks/useCaseReportDetail'

import { CaseReportDetailPage } from './CaseReportDetailPage'

vi.mock('@/hooks/useCaseReportDetail', () => ({
  useCaseReportDetail: vi.fn(),
}))

const mockUseCaseReportDetail = vi.mocked(useCaseReportDetail)

function caseReportDetail(
  overrides: Partial<CaseReportDetail> = {},
): CaseReportDetail {
  return {
    caseReportId: 'aaaaaaaa-0000-0000-0000-000000000002',
    runner: {
      runnerId: 'runner-b',
      runnerName: 'Runner B',
      runnerOwner: 'bob',
      ip: '127.0.0.1',
    },
    runnerOwner: 'bob',
    caseId: 'CASE-2',
    caseName: 'Checkout applies coupon',
    module: 'checkout',
    startedAt: '2026-06-30T02:00:00Z',
    endedAt: '2026-06-30T02:10:00Z',
    durationMs: 600000,
    result: 'failed',
    errorType: 'AssertionError',
    errorMessage: 'expected discount',
    reportUrl:
      '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002/report',
    reportFilename: 'report.html',
    reportContentType: 'text/html',
    reportSizeBytes: 100,
    createdAt: '2026-06-30T02:11:00Z',
    ...overrides,
  }
}

function mockCaseReportDetailQuery(
  overrides: Partial<ReturnType<typeof useCaseReportDetail>> = {},
) {
  const refetch = vi.fn()
  mockUseCaseReportDetail.mockReturnValue({
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    refetch,
    ...overrides,
  } as ReturnType<typeof useCaseReportDetail>)
  return { refetch }
}

function renderCaseReportDetailPage(path = '/case-reports/detail-1') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/case-reports/:caseReportId"
          element={<CaseReportDetailPage />}
        />
        <Route path="/case-reports" element={<CaseReportDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CaseReportDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state while fetching detail', () => {
    mockCaseReportDetailQuery({ isPending: true })

    renderCaseReportDetailPage()

    expect(screen.getByText('加载用例报告详情')).toBeInTheDocument()
  })

  it('renders an error state with retry', () => {
    const { refetch } = mockCaseReportDetailQuery({
      error: new Error('Network failed'),
      isError: true,
    })

    renderCaseReportDetailPage()

    expect(screen.getByText('Network failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders empty state when route param or data is missing', () => {
    mockCaseReportDetailQuery()

    renderCaseReportDetailPage('/case-reports')

    expect(screen.getByText('暂无用例报告详情')).toBeInTheDocument()
    expect(mockUseCaseReportDetail).toHaveBeenCalledWith(undefined)
  })

  it('renders case report detail with report link and metadata', () => {
    mockCaseReportDetailQuery({ data: caseReportDetail() })

    renderCaseReportDetailPage(
      '/case-reports/aaaaaaaa-0000-0000-0000-000000000002',
    )

    expect(
      screen.getByRole('heading', { name: 'Checkout applies coupon' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '用例信息' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '执行机' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '错误信息' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '报告文件' })).toBeInTheDocument()
    expect(screen.getByText('失败')).toHaveAttribute('data-result', 'failed')
    expect(screen.getByText('checkout')).toBeInTheDocument()
    expect(screen.getByText('runner-b')).toBeInTheDocument()
    expect(screen.getByText('Runner B')).toBeInTheDocument()
    expect(screen.getAllByText('bob')).toHaveLength(2)
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument()
    expect(screen.getByText('10 分钟')).toBeInTheDocument()
    expect(screen.getByText('AssertionError')).toBeInTheDocument()
    expect(screen.getByText('expected discount')).toBeInTheDocument()
    expect(screen.getByText('report.html')).toBeInTheDocument()
    expect(screen.getByText('text/html')).toBeInTheDocument()
    expect(screen.getByText('100 B')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '打开报告' })).toHaveAttribute(
      'href',
      '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000002/report',
    )
    expect(screen.getByRole('link', { name: '返回用例报告' })).toHaveAttribute(
      'href',
      '/case-reports',
    )
  })
})
