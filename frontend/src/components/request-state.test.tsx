import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState, ErrorState, LoadingState } from './request-state'

describe('request state components', () => {
  it('renders an accessible loading state', () => {
    render(<LoadingState title="加载用例报告" description="正在请求数据" />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.getByText('加载用例报告')).toBeInTheDocument()
    expect(screen.getByText('正在请求数据')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
  })

  it('renders an empty state with an optional action', () => {
    render(
      <EmptyState
        title="暂无用例报告"
        description="调整筛选条件后重试"
        action={<a href="/case-reports">查看用例报告</a>}
      />,
    )

    expect(screen.getByText('暂无用例报告')).toBeInTheDocument()
    expect(screen.getByText('调整筛选条件后重试')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看用例报告' })).toHaveAttribute(
      'href',
      '/case-reports',
    )
  })

  it('renders an error state with parsed API message and retry action', () => {
    const retry = vi.fn()

    render(<ErrorState error={{ detail: '服务不可用' }} retry={retry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('服务不可用')

    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(retry).toHaveBeenCalledTimes(1)
  })
})
