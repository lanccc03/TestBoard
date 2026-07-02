import { useState } from 'react'

import type { CaseReportsQuery, CaseResult } from '@/api/caseReports'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
import {
  CaseReportsFilters,
  type CaseReportsFilterDraft,
} from '@/features/caseReports/components/CaseReportsFilters'
import { CaseReportsPagination } from '@/features/caseReports/components/CaseReportsPagination'
import { CaseReportsTable } from '@/features/caseReports/components/CaseReportsTable'
import { useCaseReports } from '@/hooks/useCaseReports'

const DEFAULT_PAGE_SIZE = 20
const defaultCaseReportsFilterDraft: CaseReportsFilterDraft = {
  startedAtFrom: '',
  startedAtTo: '',
  runnerOwner: '',
  runnerId: '',
  result: 'all',
  module: '',
  query: '',
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

function toCaseReportsQuery(
  filters: CaseReportsFilterDraft,
  page: number,
): CaseReportsQuery {
  return {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    startedAtFrom: dateTimeLocalToIso(filters.startedAtFrom),
    startedAtTo: dateTimeLocalToIso(filters.startedAtTo),
    runnerOwner: emptyStringToUndefined(filters.runnerOwner),
    runnerId: emptyStringToUndefined(filters.runnerId),
    result:
      filters.result === 'all' ? undefined : (filters.result as CaseResult),
    module: emptyStringToUndefined(filters.module),
    query: emptyStringToUndefined(filters.query),
  }
}

export function CaseReportsPage() {
  const [draftFilters, setDraftFilters] = useState<CaseReportsFilterDraft>(
    defaultCaseReportsFilterDraft,
  )
  const [query, setQuery] = useState<CaseReportsQuery>(() =>
    toCaseReportsQuery(defaultCaseReportsFilterDraft, 1),
  )
  const caseReportsQuery = useCaseReports(query)

  function handleSubmitFilters() {
    setQuery(toCaseReportsQuery(draftFilters, 1))
  }

  function handleResetFilters() {
    setDraftFilters(defaultCaseReportsFilterDraft)
    setQuery(toCaseReportsQuery(defaultCaseReportsFilterDraft, 1))
  }

  function handlePageChange(page: number) {
    setQuery((currentQuery) => ({ ...currentQuery, page }))
  }

  const caseReportsData = caseReportsQuery.data

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">用例报告</h2>
        <p className="text-muted-foreground text-sm">
          按时间、owner、执行机、结果、模块和用例筛选历史用例报告。
        </p>
      </div>

      <CaseReportsFilters
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onSubmit={handleSubmitFilters}
        onReset={handleResetFilters}
      />

      {caseReportsQuery.isPending ? (
        <LoadingState
          title="加载用例报告"
          description="正在获取用例报告数据。"
        />
      ) : caseReportsQuery.isError ? (
        <ErrorState
          error={caseReportsQuery.error}
          retry={() => {
            void caseReportsQuery.refetch()
          }}
        />
      ) : !caseReportsData || caseReportsData.items.length === 0 ? (
        <EmptyState
          title="暂无用例报告"
          description="调整筛选条件或先上报用例报告。"
        />
      ) : (
        <>
          <CaseReportsTable items={caseReportsData.items} />
          <CaseReportsPagination
            page={caseReportsData.page}
            total={caseReportsData.total}
            totalPages={caseReportsData.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  )
}
