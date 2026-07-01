import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState, ErrorState, LoadingState } from './request-state'

describe('request state components', () => {
  it('renders an accessible loading state', () => {
    render(<LoadingState title="加载任务列表" description="正在请求数据" />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.getByText('加载任务列表')).toBeInTheDocument()
    expect(screen.getByText('正在请求数据')).toBeInTheDocument()
  })

  it('renders an empty state with an optional action', () => {
    render(
      <EmptyState
        title="暂无任务"
        description="调整筛选条件后重试"
        action={<a href="/runs">查看任务列表</a>}
      />,
    )

    expect(screen.getByText('暂无任务')).toBeInTheDocument()
    expect(screen.getByText('调整筛选条件后重试')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看任务列表' })).toHaveAttribute(
      'href',
      '/runs',
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
