import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { AppProviders } from './providers/AppProviders'
import App from './App'

function renderAppAt(path: string) {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('App', () => {
  it('renders the application shell navigation', () => {
    renderAppAt('/')

    expect(
      screen.getByRole('heading', { name: 'TestBoard' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByRole('link', { name: '用例报告' })).toHaveAttribute(
      'href',
      '/case-reports',
    )
    expect(screen.getByRole('link', { name: '失败用例' })).toHaveAttribute(
      'href',
      '/failures',
    )
    expect(screen.getByRole('link', { name: '统计趋势' })).toHaveAttribute(
      'href',
      '/stats',
    )
  })

  it('renders the dashboard placeholder at /', () => {
    renderAppAt('/')

    expect(
      screen.getByRole('heading', { name: '首页看板' }),
    ).toBeInTheDocument()
    expect(screen.getByText('加载首页看板')).toBeInTheDocument()
  })

  it('renders the case reports page at /case-reports', () => {
    renderAppAt('/case-reports')

    expect(
      screen.getByRole('heading', { name: '用例报告' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/按时间、owner、执行机、结果、模块和用例筛选/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '筛选' })).toBeInTheDocument()
  })

  it('renders the case report detail route', () => {
    renderAppAt('/case-reports/test-report-1')

    expect(screen.getByText('加载用例报告详情')).toBeInTheDocument()
  })

  it('renders the failures page at /failures', () => {
    renderAppAt('/failures')

    expect(
      screen.getByRole('heading', { name: '失败用例' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/筛选失败或异常用例/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '筛选' })).toBeInTheDocument()
  })

  it('renders the stats page at /stats', () => {
    renderAppAt('/stats')

    expect(
      screen.getByRole('heading', { name: '统计趋势' }),
    ).toBeInTheDocument()
    expect(screen.getByText('加载统计数据')).toBeInTheDocument()
  })
})
