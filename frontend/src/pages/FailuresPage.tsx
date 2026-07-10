import { useState } from 'react'

import type { FailureCasesQuery } from '@/api/failureCases'
import { DataPanel } from '@/components/data-panel'
import { PageHeader } from '@/components/page-header'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
import { Button } from '@/components/ui/button'
import { CaseReportsPagination } from '@/features/caseReports/components/CaseReportsPagination'
import {
  FailureCasesFilters,
  type FailureCasesFilterDraft,
} from '@/features/failureCases/components/FailureCasesFilters'
import { FailureCasesTable } from '@/features/failureCases/components/FailureCasesTable'
import { useFailureCases } from '@/hooks/useFailureCases'

const DEFAULT_PAGE_SIZE = 20
const defaultFailureCasesFilterDraft: FailureCasesFilterDraft = {
  startedAtFrom: '',
  startedAtTo: '',
  runnerOwner: '',
  runnerId: '',
  module: '',
  caseId: '',
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

function toFailureCasesQuery(
  filters: FailureCasesFilterDraft,
  page: number,
): FailureCasesQuery {
  return {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    startedAtFrom: dateTimeLocalToIso(filters.startedAtFrom),
    startedAtTo: dateTimeLocalToIso(filters.startedAtTo),
    runnerOwner: emptyStringToUndefined(filters.runnerOwner),
    runnerId: emptyStringToUndefined(filters.runnerId),
    module: emptyStringToUndefined(filters.module),
    caseId: emptyStringToUndefined(filters.caseId),
  }
}

export function FailuresPage() {
  const [draftFilters, setDraftFilters] = useState<FailureCasesFilterDraft>(
    defaultFailureCasesFilterDraft,
  )
  const [query, setQuery] = useState<FailureCasesQuery>(() =>
    toFailureCasesQuery(defaultFailureCasesFilterDraft, 1),
  )
  const failureCasesQuery = useFailureCases(query)
  const failureCasesData = failureCasesQuery.data

  function handleSubmitFilters() {
    setQuery(toFailureCasesQuery(draftFilters, 1))
  }

  function handleResetFilters() {
    setDraftFilters(defaultFailureCasesFilterDraft)
    setQuery(toFailureCasesQuery(defaultFailureCasesFilterDraft, 1))
  }

  function handlePageChange(page: number) {
    setQuery((currentQuery) => ({ ...currentQuery, page }))
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="故障排查"
        title="失败用例"
        description="按时间、owner、执行机、模块和用例 ID 筛选失败或异常用例。"
      />

      <FailureCasesFilters
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onSubmit={handleSubmitFilters}
        onReset={handleResetFilters}
      />

      {failureCasesQuery.isPending ? (
        <LoadingState
          title="加载失败用例"
          description="正在获取失败用例数据。"
        />
      ) : failureCasesQuery.isError ? (
        <ErrorState
          error={failureCasesQuery.error}
          retry={() => {
            void failureCasesQuery.refetch()
          }}
        />
      ) : !failureCasesData || failureCasesData.items.length === 0 ? (
        <EmptyState
          title="暂无失败用例"
          description="调整筛选条件或等待新的失败用例上报。"
          action={
            <Button variant="outline" onClick={handleResetFilters}>
              重置筛选
            </Button>
          }
        />
      ) : (
        <DataPanel
          title="失败记录"
          description="聚焦失败与异常结果，快速进入报告和详情。"
          meta={`${failureCasesData.total} 条`}
          contentClassName="p-0"
          className="border-destructive/20"
        >
          <FailureCasesTable items={failureCasesData.items} />
          <div className="border-t">
            <CaseReportsPagination
              page={failureCasesData.page}
              total={failureCasesData.total}
              totalPages={failureCasesData.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </DataPanel>
      )}
    </section>
  )
}
