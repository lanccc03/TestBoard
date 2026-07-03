import { Link } from 'react-router'

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
import { Button } from '@/components/ui/button'
import { DashboardMetricCards } from '@/features/dashboard/components/DashboardMetricCards'
import { DashboardOwnerSummaryTable } from '@/features/dashboard/components/DashboardOwnerSummaryTable'
import { DashboardRecentFailuresTable } from '@/features/dashboard/components/DashboardRecentFailuresTable'
import { DashboardRecentRunnersTable } from '@/features/dashboard/components/DashboardRecentRunnersTable'
import { formatDateTime } from '@/features/caseReports/lib/formatters'
import { useDashboard } from '@/hooks/useDashboard'

export function DashboardPage() {
  const dashboardQuery = useDashboard()
  const dashboardData = dashboardQuery.data
  const isEmpty =
    dashboardData?.today.total === 0 &&
    dashboardData.ownerSummaries.length === 0 &&
    dashboardData.recentRunners.length === 0 &&
    dashboardData.recentFailures.length === 0

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">首页看板</h2>
        <p className="text-muted-foreground text-sm">
          展示今日质量概览、owner 聚合、执行机最近结果和最近失败用例。
        </p>
      </div>

      {dashboardQuery.isPending ? (
        <LoadingState
          title="加载首页看板"
          description="正在获取首页统计数据。"
        />
      ) : dashboardQuery.isError ? (
        <ErrorState
          error={dashboardQuery.error}
          retry={() => {
            void dashboardQuery.refetch()
          }}
        />
      ) : !dashboardData || isEmpty ? (
        <EmptyState
          title="暂无看板数据"
          description="等待新的用例报告上报后，首页会展示质量概览和失败入口。"
          action={
            <Button asChild variant="outline">
              <Link to="/case-reports">查看用例报告</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="text-muted-foreground text-sm">
            统计窗口：{formatDateTime(dashboardData.todayStart)} 至{' '}
            {formatDateTime(dashboardData.todayEnd)}
          </div>
          <DashboardMetricCards today={dashboardData.today} />
          {dashboardData.ownerSummaries.length > 0 ? (
            <DashboardOwnerSummaryTable items={dashboardData.ownerSummaries} />
          ) : null}
          {dashboardData.recentRunners.length > 0 ? (
            <DashboardRecentRunnersTable items={dashboardData.recentRunners} />
          ) : null}
          {dashboardData.recentFailures.length > 0 ? (
            <DashboardRecentFailuresTable
              items={dashboardData.recentFailures}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
