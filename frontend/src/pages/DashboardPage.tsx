import { Link } from 'react-router'

import { PageHeader } from '@/components/page-header'
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
      <PageHeader
        eyebrow="质量概览"
        title="首页看板"
        description="展示今日质量概览、owner 聚合、执行机最近结果和最近失败用例。"
        meta={
          dashboardData ? (
            <span>
              统计窗口：{formatDateTime(dashboardData.todayStart)} 至{' '}
              {formatDateTime(dashboardData.todayEnd)}
            </span>
          ) : undefined
        }
      />

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
          <DashboardMetricCards today={dashboardData.today} />
          {dashboardData.ownerSummaries.length > 0 ||
          dashboardData.recentRunners.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {dashboardData.ownerSummaries.length > 0 ? (
                <div className="col-span-2">
                  <DashboardOwnerSummaryTable
                    items={dashboardData.ownerSummaries}
                  />
                </div>
              ) : null}
              {dashboardData.recentRunners.length > 0 ? (
                <div className="col-span-3">
                  <DashboardRecentRunnersTable
                    items={dashboardData.recentRunners}
                  />
                </div>
              ) : null}
            </div>
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
