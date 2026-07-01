import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import App from './App'

function renderAppAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
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
    expect(screen.getByRole('link', { name: '任务列表' })).toHaveAttribute(
      'href',
      '/runs',
    )
    expect(screen.getByRole('link', { name: '失败用例' })).toHaveAttribute(
      'href',
      '/failures',
    )
  })

  it('renders the dashboard placeholder at /', () => {
    renderAppAt('/')

    expect(
      screen.getByRole('heading', { name: '首页看板' }),
    ).toBeInTheDocument()
    expect(screen.getByText('http://localhost:8000')).toBeInTheDocument()
  })

  it('renders the runs placeholder at /runs', () => {
    renderAppAt('/runs')

    expect(
      screen.getByRole('heading', { name: '任务列表' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/任务列表查询切片会在这里接入/)).toBeInTheDocument()
  })

  it('renders the run detail placeholder with route params', () => {
    renderAppAt('/runs/test-run-1')

    expect(
      screen.getByRole('heading', { name: '任务详情' }),
    ).toBeInTheDocument()
    expect(screen.getByText('test-run-1')).toBeInTheDocument()
  })

  it('renders the failures placeholder at /failures', () => {
    renderAppAt('/failures')

    expect(
      screen.getByRole('heading', { name: '失败用例' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/失败用例排查切片会在这里接入/)).toBeInTheDocument()
  })
})
