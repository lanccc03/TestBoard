import { useState } from 'react'
import {
  ActivityIcon,
  BarChart3Icon,
  CircleAlertIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from 'lucide-react'

import type { StatsByDateItem, StatsQuery } from '@/api/stats'
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
import { cn } from '@/lib/utils'

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

type SummaryTone = 'neutral' | 'success' | 'danger' | 'warning'

type SummaryMetricCardProps = {
  label: string
  value: string
  description: string
  tone: SummaryTone
  icon: LucideIcon
}

const summaryToneClasses: Record<SummaryTone, string> = {
  neutral: 'border-l-foreground/60 bg-card',
  success: 'border-l-emerald-500 bg-emerald-50/60',
  danger: 'border-l-destructive bg-destructive/5',
  warning: 'border-l-amber-500 bg-amber-50/70',
}

const summaryIconClasses: Record<SummaryTone, string> = {
  neutral: 'bg-foreground/10 text-foreground',
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-destructive/10 text-destructive',
  warning: 'bg-amber-100 text-amber-700',
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

function SummaryMetricCard({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: SummaryMetricCardProps) {
  return (
    <div
      className={cn(
        'flex min-h-28 flex-col justify-between rounded-lg border border-l-4 p-4 shadow-sm',
        summaryToneClasses[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm font-medium">
            {label}
          </span>
          <span className="text-2xl font-semibold tracking-normal">
            {value}
          </span>
        </div>
        <div
          className={cn(
            'flex size-8 items-center justify-center rounded-lg',
            summaryIconClasses[tone],
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
  )
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
      <div className="bg-muted/40 flex flex-col gap-5 rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-normal">
                统计趋势
              </h2>
              {summary ? (
                <Badge
                  variant={
                    summary.failureCount > 0 ? 'destructive' : 'secondary'
                  }
                >
                  {summary.failureCount > 0 ? '存在失败' : '状态稳定'}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">
              展示日期趋势，以及 owner、执行机、用例维度的 Top 10 对比。
            </p>
          </div>

          {hasCompleteStatsData ? (
            <div className="bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2 text-sm">
              统计窗口：{formatDateTime(byDateData.range.startedAtFrom)} 至{' '}
              {formatDateTime(byDateData.range.startedAtTo)}
            </div>
          ) : null}
        </div>

        {summary ? (
          <section
            aria-label="统计概览"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <SummaryMetricCard
              label="报告总数"
              value={formatCount(summary.totalReports)}
              description="当前统计窗口内的报告量"
              tone="neutral"
              icon={BarChart3Icon}
            />
            <SummaryMetricCard
              label="失败风险"
              value={formatCount(summary.failureCount)}
              description="失败、错误等未通过结果"
              tone={summary.failureCount > 0 ? 'danger' : 'success'}
              icon={CircleAlertIcon}
            />
            <SummaryMetricCard
              label="通过率"
              value={formatPassRate(summary.passRate)}
              description="按通过、失败、错误结果计算"
              tone={
                summary.passRate !== null && summary.passRate >= 0.8
                  ? 'success'
                  : 'warning'
              }
              icon={ShieldCheckIcon}
            />
            <SummaryMetricCard
              label="阻塞 / 异常"
              value={formatCount(summary.blockedAndError)}
              description="需要优先关注的执行中断"
              tone={summary.blockedAndError > 0 ? 'warning' : 'success'}
              icon={ActivityIcon}
            />
          </section>
        ) : null}
      </div>

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
