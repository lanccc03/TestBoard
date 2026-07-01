import { useState } from 'react'

import type { RunStatus, RunsQuery } from '@/api/runs'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
import { useRuns } from '@/hooks/useRuns'

import { RunsFilters, type RunsFilterDraft } from './RunsFilters'
import { RunsPagination } from './RunsPagination'
import { RunsTable } from './RunsTable'

const DEFAULT_PAGE_SIZE = 20
const defaultRunsFilterDraft: RunsFilterDraft = {
  startedAtFrom: '',
  startedAtTo: '',
  runnerOwner: '',
  runnerId: '',
  status: 'all',
}

function dateTimeLocalToIso(value: string): string | undefined {
  if (!value) {
    return undefined
  }

  return new Date(value).toISOString()
}

function emptyStringToUndefined(value: string): string | undefined {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function toRunsQuery(filters: RunsFilterDraft, page: number): RunsQuery {
  return {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    startedAtFrom: dateTimeLocalToIso(filters.startedAtFrom),
    startedAtTo: dateTimeLocalToIso(filters.startedAtTo),
    runnerOwner: emptyStringToUndefined(filters.runnerOwner),
    runnerId: emptyStringToUndefined(filters.runnerId),
    status:
      filters.status === 'all' ? undefined : (filters.status as RunStatus),
  }
}

export function RunsPage() {
  const [draftFilters, setDraftFilters] = useState<RunsFilterDraft>(
    defaultRunsFilterDraft,
  )
  const [query, setQuery] = useState<RunsQuery>(() =>
    toRunsQuery(defaultRunsFilterDraft, 1),
  )
  const runsQuery = useRuns(query)

  function handleSubmitFilters() {
    setQuery(toRunsQuery(draftFilters, 1))
  }

  function handleResetFilters() {
    setDraftFilters(defaultRunsFilterDraft)
    setQuery(toRunsQuery(defaultRunsFilterDraft, 1))
  }

  function handlePageChange(page: number) {
    setQuery((currentQuery) => ({ ...currentQuery, page }))
  }

  const runsData = runsQuery.data

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">任务列表</h2>
        <p className="text-muted-foreground text-sm">
          按时间、owner、执行机和状态筛选历史测试任务。
        </p>
      </div>

      <RunsFilters
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onSubmit={handleSubmitFilters}
        onReset={handleResetFilters}
      />

      {runsQuery.isPending ? (
        <LoadingState title="加载任务列表" description="正在获取任务数据。" />
      ) : runsQuery.isError ? (
        <ErrorState
          error={runsQuery.error}
          retry={() => {
            void runsQuery.refetch()
          }}
        />
      ) : !runsData || runsData.items.length === 0 ? (
        <EmptyState
          title="暂无任务"
          description="调整筛选条件或先上报测试结果。"
        />
      ) : (
        <>
          <RunsTable items={runsData.items} />
          <RunsPagination
            page={runsData.page}
            total={runsData.total}
            totalPages={runsData.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  )
}
