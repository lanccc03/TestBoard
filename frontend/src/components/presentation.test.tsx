import { render, screen, within } from '@testing-library/react'
import { ActivityIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { DataPanel } from '@/components/data-panel'
import { MetricCard } from '@/components/metric-card'
import { PageHeader } from '@/components/page-header'

describe('shared presentation components', () => {
  it('renders a page header with status, metadata, and action', () => {
    render(
      <PageHeader
        eyebrow="质量工作区"
        title="用例报告"
        status={<span>状态稳定</span>}
        meta={<span>统计窗口：今天</span>}
        action={<button type="button">刷新</button>}
      />,
    )

    expect(
      screen.getByRole('heading', { name: '用例报告' }),
    ).toBeInTheDocument()
    expect(screen.getByText('质量工作区')).toBeInTheDocument()
    expect(screen.getByText('状态稳定')).toBeInTheDocument()
    expect(screen.getByText('统计窗口：今天')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument()
  })

  it('renders a labeled metric card and accessible data panel', () => {
    render(
      <>
        <MetricCard
          label="今日失败用例"
          value="24"
          description="7 个新增"
          icon={ActivityIcon}
          tone="destructive"
        />
        <DataPanel
          title="最近失败"
          description="最近上报的失败用例。"
          meta="3 条"
        >
          <p>支付回调失败</p>
        </DataPanel>
      </>,
    )

    const metric = screen.getByRole('article', { name: '今日失败用例' })
    expect(within(metric).getByText('24')).toBeInTheDocument()
    expect(within(metric).getByText('7 个新增')).toBeInTheDocument()

    const panel = screen.getByRole('region', { name: '最近失败' })
    expect(within(panel).getByText('3 条')).toBeInTheDocument()
    expect(within(panel).getByText('支付回调失败')).toBeInTheDocument()
  })
})
