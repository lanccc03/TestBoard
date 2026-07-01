import { RotateCcwIcon, SearchIcon } from 'lucide-react'
import type { FormEvent } from 'react'

import type { RunStatus } from '@/api/runs'
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

export type RunsFilterDraft = {
  startedAtFrom: string
  startedAtTo: string
  runnerOwner: string
  runnerId: string
  status: RunStatus | 'all'
}

type RunsFiltersProps = {
  filters: RunsFilterDraft
  onFiltersChange: (filters: RunsFilterDraft) => void
  onSubmit: () => void
  onReset: () => void
}

export function RunsFilters({
  filters,
  onFiltersChange,
  onSubmit,
  onReset,
}: RunsFiltersProps) {
  function updateFilter<Key extends keyof RunsFilterDraft>(
    key: Key,
    value: RunsFilterDraft[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="rounded-lg border p-4" onSubmit={handleSubmit}>
      <FieldGroup className="grid gap-3 md:grid-cols-5">
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
          <FieldLabel htmlFor="run-status">任务状态</FieldLabel>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              updateFilter('status', value as RunsFilterDraft['status'])
            }
          >
            <SelectTrigger id="run-status" className="w-full">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="passed">通过</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="error">异常</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex items-end gap-2 md:col-span-5">
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
