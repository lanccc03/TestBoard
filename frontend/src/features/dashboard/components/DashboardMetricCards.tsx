import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  FileTextIcon,
  GaugeIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardTodaySummary } from '@/api/dashboard'
import { MetricCard } from '@/components/metric-card'
import { Button } from '@/components/ui/button'
import { formatPassRate } from '@/features/dashboard/lib/formatters'

type DashboardMetricCardsProps = { today: DashboardTodaySummary }

export function DashboardMetricCards({ today }: DashboardMetricCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        label="今日报告总数"
        value={today.total}
        description="今日接收的用例报告"
        icon={FileTextIcon}
        action={
          <Button asChild variant="link" size="xs" className="h-auto px-0">
            <Link to="/case-reports">
              查看全部报告
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      />
      <MetricCard
        label="今日通过率"
        value={formatPassRate(today.passRate)}
        description="通过 / 已执行用例"
        icon={GaugeIcon}
        tone={
          today.passRate !== null && today.passRate >= 0.8
            ? 'success'
            : 'warning'
        }
      />
      <MetricCard
        label="今日失败用例"
        value={today.failed}
        description="失败与异常结果"
        icon={CircleAlertIcon}
        tone={today.failed > 0 ? 'destructive' : 'success'}
        action={
          <Button asChild variant="link" size="xs" className="h-auto px-0">
            <Link to="/failures">
              查看失败用例
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      />
      <MetricCard
        label="今日通过用例"
        value={today.passed}
        description="成功完成的用例"
        icon={CheckCircle2Icon}
        tone="success"
      />
    </div>
  )
}
