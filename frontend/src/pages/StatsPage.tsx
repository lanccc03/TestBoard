import { useState } from 'react'

import type { StatsQuery } from '@/api/stats'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
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
import { useStats } from '@/hooks/useStats'

const DEFAULT_LIMIT = 10
const EMPTY_FILTERS: StatsFilterDraft = {
  startedAtFrom: '',
  startedAtTo: '',
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

  function submitFilters() {
    setQuery(toStatsQuery(filters))
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setQuery({ limit: DEFAULT_LIMIT })
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">统计趋势</h2>
        <p className="text-muted-foreground text-sm">
          展示日期趋势，以及 owner、执行机、用例维度的 Top 10 对比。
        </p>
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
          <div className="text-muted-foreground text-sm">
            统计窗口：{formatDateTime(byDateData.range.startedAtFrom)} 至{' '}
            {formatDateTime(byDateData.range.startedAtTo)}
          </div>
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
