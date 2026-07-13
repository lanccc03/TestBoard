import { useState } from 'react'
import {
  ActivityIcon,
  BarChart3Icon,
  CircleAlertIcon,
  ShieldCheckIcon,
} from 'lucide-react'

import type { StatsByDateItem, StatsQuery } from '@/api/stats'
import { MetricCard } from '@/components/metric-card'
import { PageHeader } from '@/components/page-header'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
import { Badge } from '@/components/ui/badge'
import {
  StatsComparisonSection,
  type StatsComparisonItem,
} from '@/features/stats/components/StatsComparisonSection'
import {
  StatsFilters,
  type StatsFilterDraft,
} from '@/features/stats/components/StatsFilters'
import { StatsTrendSection } from '@/features/stats/components/StatsTrendSection'
import { formatDateTime } from '@/features/caseReports/lib/formatters'
import { formatCount, formatPassRate } from '@/features/stats/lib/formatters'
import { useStats } from '@/hooks/useStats'

const DEFAULT_LIMIT = 10
const EMPTY_FILTERS: StatsFilterDraft = {
  startedAtFrom: '',
  startedAtTo: '',
}

type StatsSummary = {
  totalReports: number
  failureCount: number
  passRate: number | null
  blockedAndError: number
}

function buildStatsSummary(items: StatsByDateItem[]): StatsSummary {
  const totals = items.reduce(
    (accumulator, item) => ({
      totalReports: accumulator.totalReports + item.total,
      passed: accumulator.passed + item.passed,
      failed: accumulator.failed + item.failed,
      error: accumulator.error + item.error,
      failureCount: accumulator.failureCount + item.failureCount,
      blockedAndError: accumulator.blockedAndError + item.blocked + item.error,
    }),
    {
      totalReports: 0,
      passed: 0,
      failed: 0,
      error: 0,
      failureCount: 0,
      blockedAndError: 0,
    },
  )
  const passRateDenominator = totals.passed + totals.failed + totals.error

  return {
    totalReports: totals.totalReports,
    failureCount: totals.failureCount,
    passRate:
      passRateDenominator === 0 ? null : totals.passed / passRateDenominator,
    blockedAndError: totals.blockedAndError,
  }
}

function toStatsQuery(filters: StatsFilterDraft): StatsQuery {
  return {
    startedAtFrom: filters.startedAtFrom || undefined,
    startedAtTo: filters.startedAtTo || undefined,
    limit: DEFAULT_LIMIT,
  }
}

function ownerItems(
  items: NonNullable<ReturnType<typeof useStats>['byOwner']['data']>['items'],
): StatsComparisonItem[] {
  return items.map((item) => ({
    id: item.runnerOwner,
    label: item.runnerOwner,
    description: null,
    ...item,
  }))
}

function runnerItems(
  items: NonNullable<ReturnType<typeof useStats>['byRunner']['data']>['items'],
): StatsComparisonItem[] {
  return items.map((item) => ({
    id: item.runnerId,
    label: item.runnerName ?? item.runnerId,
    description: item.runnerOwner,
    ...item,
  }))
}

function caseItems(
  items: NonNullable<ReturnType<typeof useStats>['byCase']['data']>['items'],
): StatsComparisonItem[] {
  return items.map((item) => ({
    id: `${item.caseId}-${item.caseName}-${item.module ?? ''}`,
    label: item.caseId,
    description: `${item.caseName}${item.module ? ` / ${item.module}` : ''}`,
    ...item,
  }))
}

export function StatsPage() {
  const [filters, setFilters] = useState<StatsFilterDraft>(EMPTY_FILTERS)
  const [query, setQuery] = useState<StatsQuery>({ limit: DEFAULT_LIMIT })
  const stats = useStats(query)
  const queries = [stats.byDate, stats.byOwner, stats.byRunner, stats.byCase]
  const errorQuery = queries.find((item) => item.isError)
  const isPending = queries.some((item) => item.isPending)
  const byDateData = stats.byDate.data
  const byOwnerData = stats.byOwner.data
  const byRunnerData = stats.byRunner.data
  const byCaseData = stats.byCase.data
  const isEmpty =
    byDateData?.items.every((item) => item.total === 0) === true &&
    byOwnerData?.items.length === 0 &&
    byRunnerData?.items.length === 0 &&
    byCaseData?.items.length === 0
  const hasCompleteStatsData =
    !isPending &&
    !errorQuery &&
    byDateData !== undefined &&
    byOwnerData !== undefined &&
    byRunnerData !== undefined &&
    byCaseData !== undefined
  const summary = hasCompleteStatsData
    ? buildStatsSummary(byDateData.items)
    : null

  function submitFilters() {
    setQuery(toStatsQuery(filters))
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setQuery({ limit: DEFAULT_LIMIT })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="质量分析"
        title="统计趋势"
        status={
          summary ? (
            <Badge
              variant={summary.failureCount > 0 ? 'destructive' : 'secondary'}
            >
              {summary.failureCount > 0 ? '存在失败' : '状态稳定'}
            </Badge>
          ) : undefined
        }
        meta={
          hasCompleteStatsData ? (
            <span>
              统计窗口：{formatDateTime(byDateData.range.startedAtFrom)} 至{' '}
              {formatDateTime(byDateData.range.startedAtTo)}
            </span>
          ) : undefined
        }
      />

      {summary ? (
        <section aria-label="统计概览" className="grid grid-cols-4 gap-4">
          <MetricCard
            label="报告总数"
            value={formatCount(summary.totalReports)}
            description="当前统计窗口内的报告量"
            icon={BarChart3Icon}
          />
          <MetricCard
            label="失败风险"
            value={formatCount(summary.failureCount)}
            description="失败、错误等未通过结果"
            icon={CircleAlertIcon}
            tone={summary.failureCount > 0 ? 'destructive' : 'success'}
          />
          <MetricCard
            label="通过率"
            value={formatPassRate(summary.passRate)}
            description="按通过、失败、错误结果计算"
            icon={ShieldCheckIcon}
            tone={
              summary.passRate !== null && summary.passRate >= 0.8
                ? 'success'
                : 'warning'
            }
          />
          <MetricCard
            label="阻塞 / 异常"
            value={formatCount(summary.blockedAndError)}
            description="需要优先关注的执行中断"
            icon={ActivityIcon}
            tone={summary.blockedAndError > 0 ? 'warning' : 'success'}
          />
        </section>
      ) : null}

      <StatsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSubmit={submitFilters}
        onReset={resetFilters}
      />

      {isPending ? (
        <LoadingState
          title="加载统计数据"
          description="正在获取统计趋势和对比数据。"
        />
      ) : errorQuery ? (
        <ErrorState
          error={errorQuery.error}
          retry={() => {
            void errorQuery.refetch()
          }}
        />
      ) : isEmpty ? (
        <EmptyState
          title="暂无统计数据"
          description="当前时间范围内没有用例报告。"
        />
      ) : byDateData && byOwnerData && byRunnerData && byCaseData ? (
        <>
          <StatsTrendSection items={byDateData.items} />
          <StatsComparisonSection
            title="Owner 对比"
            description="按报告总数排序的 owner 统计对比。"
            tableLabel="Owner 统计对比"
            items={ownerItems(byOwnerData.items)}
          />
          <StatsComparisonSection
            title="执行机对比"
            description="按报告总数排序的执行机统计对比。"
            tableLabel="执行机统计对比"
            items={runnerItems(byRunnerData.items)}
          />
          <StatsComparisonSection
            title="用例对比"
            description="按报告总数排序的用例统计对比。"
            tableLabel="用例统计对比"
            items={caseItems(byCaseData.items)}
          />
        </>
      ) : null}
    </section>
  )
}
