import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  FailureCasesQuery,
  FailureCasesResponse,
} from '@/api/failureCases'
import { useFailureCases } from '@/hooks/useFailureCases'

import { FailuresPage } from './FailuresPage'

vi.mock('@/hooks/useFailureCases', () => ({
  useFailureCases: vi.fn(),
}))

const mockUseFailureCases = vi.mocked(useFailureCases)

function failureCasesResponse(
  overrides: Partial<FailureCasesResponse> = {},
): FailureCasesResponse {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    ...overrides,
  }
}

function mockFailureCasesQuery(
  overrides: Partial<ReturnType<typeof useFailureCases>> = {},
) {
  const refetch = vi.fn()
  mockUseFailureCases.mockReturnValue({
    data: failureCasesResponse(),
    error: null,
    isError: false,
    isPending: false,
    refetch,
    ...overrides,
  } as ReturnType<typeof useFailureCases>)
  return { refetch }
}

function renderFailuresPage() {
  render(
    <MemoryRouter>
      <FailuresPage />
    </MemoryRouter>,
  )
}

describe('FailuresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the loading state while fetching failure cases', () => {
    mockFailureCasesQuery({ isPending: true, data: undefined })

    renderFailuresPage()

    expect(screen.getByText('加载失败用例')).toBeInTheDocument()
  })

  it('renders an empty state when no failure cases match the query', () => {
    mockFailureCasesQuery()

    renderFailuresPage()

    expect(screen.getByText('暂无失败用例')).toBeInTheDocument()
    expect(
      screen.getByText('调整筛选条件或等待新的失败用例上报。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置筛选' })).toBeInTheDocument()
  })

  it('renders an error state with retry', () => {
    const { refetch } = mockFailureCasesQuery({
      data: undefined,
      error: new Error('Network failed'),
      isError: true,
    })

    renderFailuresPage()

    expect(screen.getByText('Network failed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('renders failure case rows with detail and report links', () => {
    mockFailureCasesQuery({
      data: failureCasesResponse({
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
        total: 1,
        totalPages: 1,
      }),
    })

    renderFailuresPage()

    expect(screen.getByRole('region', { name: '失败记录' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: '失败用例' })).toBeInTheDocument()
    const failureRow = screen.getByRole('row', {
      name: /Search index refresh/,
    })
    expect(within(failureRow).getByText('CASE-3')).toBeInTheDocument()
    expect(within(failureRow).getByText('search')).toBeInTheDocument()
    expect(within(failureRow).getByText('runner-a')).toBeInTheDocument()
    expect(within(failureRow).getByText('alice')).toBeInTheDocument()
    expect(within(failureRow).getByText('异常')).toBeInTheDocument()
    expect(within(failureRow).getByText('RuntimeError')).toBeInTheDocument()
    expect(within(failureRow).getByText('timeout')).toBeInTheDocument()
    expect(
      within(failureRow).getByRole('link', { name: '报告' }),
    ).toHaveAttribute(
      'href',
      '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000003/report',
    )
    expect(
      within(failureRow).getByRole('link', { name: '查看详情' }),
    ).toHaveAttribute(
      'href',
      '/case-reports/aaaaaaaa-0000-0000-0000-000000000003',
    )
  })

  it('submits filters and resets pagination to the first page', () => {
    mockFailureCasesQuery()
    renderFailuresPage()

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
      target: { value: 'search' },
    })
    fireEvent.change(screen.getByLabelText('用例 ID'), {
      target: { value: 'CASE-3' },
    })
    fireEvent.click(screen.getByRole('button', { name: '筛选' }))

    expect(mockUseFailureCases).toHaveBeenLastCalledWith(
      expect.objectContaining<FailureCasesQuery>({
        page: 1,
        pageSize: 20,
        runnerOwner: 'alice',
        runnerId: 'runner-a',
        module: 'search',
        caseId: 'CASE-3',
      }),
    )
  })

  it('resets filters to defaults', () => {
    mockFailureCasesQuery()
    renderFailuresPage()

    fireEvent.change(screen.getByLabelText('Owner'), {
      target: { value: 'alice' },
    })
    fireEvent.click(screen.getByRole('button', { name: '重置' }))

    expect(mockUseFailureCases).toHaveBeenLastCalledWith(
      expect.objectContaining<FailureCasesQuery>({
        page: 1,
        pageSize: 20,
        runnerOwner: undefined,
      }),
    )
  })

  it('moves between pages with pagination controls', () => {
    mockFailureCasesQuery({
      data: failureCasesResponse({
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
            errorType: null,
            errorMessage: null,
            reportUrl:
              '/api/v1/case-reports/aaaaaaaa-0000-0000-0000-000000000003/report',
          },
        ],
        total: 40,
        totalPages: 2,
      }),
    })
    renderFailuresPage()

    fireEvent.click(screen.getByRole('link', { name: '下一页' }))

    expect(mockUseFailureCases).toHaveBeenLastCalledWith(
      expect.objectContaining<FailureCasesQuery>({
        page: 2,
        pageSize: 20,
      }),
    )
  })
})
