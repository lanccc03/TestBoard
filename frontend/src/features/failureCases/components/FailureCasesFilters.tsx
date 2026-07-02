import { RotateCcwIcon, SearchIcon } from 'lucide-react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type FailureCasesFilterDraft = {
  startedAtFrom: string
  startedAtTo: string
  runnerOwner: string
  runnerId: string
  module: string
  caseId: string
}

type FailureCasesFiltersProps = {
  filters: FailureCasesFilterDraft
  onFiltersChange: (filters: FailureCasesFilterDraft) => void
  onSubmit: () => void
  onReset: () => void
}

export function FailureCasesFilters({
  filters,
  onFiltersChange,
  onSubmit,
  onReset,
}: FailureCasesFiltersProps) {
  function updateFilter<Key extends keyof FailureCasesFilterDraft>(
    key: Key,
    value: FailureCasesFilterDraft[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="rounded-lg border p-4" onSubmit={handleSubmit}>
      <FieldGroup className="grid gap-3 md:grid-cols-6">
        <Field>
          <FieldLabel htmlFor="failure-started-at-from">开始时间</FieldLabel>
          <Input
            id="failure-started-at-from"
            type="datetime-local"
            value={filters.startedAtFrom}
            onChange={(event) =>
              updateFilter('startedAtFrom', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="failure-started-at-to">结束时间</FieldLabel>
          <Input
            id="failure-started-at-to"
            type="datetime-local"
            value={filters.startedAtTo}
            onChange={(event) =>
              updateFilter('startedAtTo', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="failure-runner-owner">Owner</FieldLabel>
          <Input
            id="failure-runner-owner"
            value={filters.runnerOwner}
            onChange={(event) =>
              updateFilter('runnerOwner', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="failure-runner-id">执行机</FieldLabel>
          <Input
            id="failure-runner-id"
            value={filters.runnerId}
            onChange={(event) => updateFilter('runnerId', event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="failure-module">模块</FieldLabel>
          <Input
            id="failure-module"
            value={filters.module}
            onChange={(event) => updateFilter('module', event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="failure-case-id">用例 ID</FieldLabel>
          <Input
            id="failure-case-id"
            value={filters.caseId}
            onChange={(event) => updateFilter('caseId', event.target.value)}
          />
        </Field>

        <div className="flex items-end gap-2 md:col-span-6">
          <Button type="submit">
            <SearchIcon data-icon="inline-start" />
            筛选
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            <RotateCcwIcon data-icon="inline-start" />
            重置
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
