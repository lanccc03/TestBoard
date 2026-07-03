import { ArrowRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTodaySummary } from '@/api/dashboard'
import { Button } from '@/components/ui/button'
import { formatPassRate } from '@/features/dashboard/lib/formatters'

type DashboardMetricCardsProps = {
  today: DashboardTodaySummary
}

export function DashboardMetricCards({ today }: DashboardMetricCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-card text-card-foreground rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">今日报告总数</p>
        <p className="mt-3 text-3xl font-semibold">{today.total}</p>
        <Button asChild variant="link" size="sm" className="mt-3 px-0">
          <Link to="/case-reports">
            查看全部报告
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <div className="bg-card text-card-foreground rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">今日通过率</p>
        <p className="mt-3 text-3xl font-semibold">
          {formatPassRate(today.passRate)}
        </p>
      </div>
      <div className="bg-card text-card-foreground rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">今日失败用例</p>
        <p className="mt-3 text-3xl font-semibold">{today.failed}</p>
        <Button asChild variant="link" size="sm" className="mt-3 px-0">
          <Link to="/failures">
            查看失败用例
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
      <div className="bg-card text-card-foreground rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">今日通过用例</p>
        <p className="mt-3 text-3xl font-semibold">{today.passed}</p>
      </div>
    </div>
  )
}
