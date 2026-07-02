import { RotateCcwIcon, SearchIcon } from 'lucide-react'
import type { FormEvent } from 'react'

import type { CaseResult } from '@/api/caseReports'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type CaseReportsFilterDraft = {
  startedAtFrom: string
  startedAtTo: string
  runnerOwner: string
  runnerId: string
  result: CaseResult | 'all'
  module: string
  query: string
}

type CaseReportsFiltersProps = {
  filters: CaseReportsFilterDraft
  onFiltersChange: (filters: CaseReportsFilterDraft) => void
  onSubmit: () => void
  onReset: () => void
}

export function CaseReportsFilters({
  filters,
  onFiltersChange,
  onSubmit,
  onReset,
}: CaseReportsFiltersProps) {
  function updateFilter<Key extends keyof CaseReportsFilterDraft>(
    key: Key,
    value: CaseReportsFilterDraft[Key],
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
          <FieldLabel htmlFor="started-at-from">开始时间</FieldLabel>
          <Input
            id="started-at-from"
            type="datetime-local"
            value={filters.startedAtFrom}
            onChange={(event) =>
              updateFilter('startedAtFrom', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="started-at-to">结束时间</FieldLabel>
          <Input
            id="started-at-to"
            type="datetime-local"
            value={filters.startedAtTo}
            onChange={(event) =>
              updateFilter('startedAtTo', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="runner-owner">Owner</FieldLabel>
          <Input
            id="runner-owner"
            value={filters.runnerOwner}
            onChange={(event) =>
              updateFilter('runnerOwner', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="runner-id">执行机</FieldLabel>
          <Input
            id="runner-id"
            value={filters.runnerId}
            onChange={(event) => updateFilter('runnerId', event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="module">模块</FieldLabel>
          <Input
            id="module"
            value={filters.module}
            onChange={(event) => updateFilter('module', event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="case-result">结果</FieldLabel>
          <Select
            value={filters.result}
            onValueChange={(value) =>
              updateFilter('result', value as CaseReportsFilterDraft['result'])
            }
          >
            <SelectTrigger id="case-result" className="w-full">
              <SelectValue placeholder="全部结果" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="passed">通过</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="skipped">跳过</SelectItem>
                <SelectItem value="blocked">阻塞</SelectItem>
                <SelectItem value="error">异常</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field className="md:col-span-3">
          <FieldLabel htmlFor="case-query">用例 ID 或名称</FieldLabel>
          <Input
            id="case-query"
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
          />
        </Field>

        <div className="flex items-end gap-2 md:col-span-3">
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
