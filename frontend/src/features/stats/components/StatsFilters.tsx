import { RotateCcwIcon, SearchIcon } from 'lucide-react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type StatsFilterDraft = {
  startedAtFrom: string
  startedAtTo: string
}

type StatsFiltersProps = {
  filters: StatsFilterDraft
  onFiltersChange: (filters: StatsFilterDraft) => void
  onSubmit: () => void
  onReset: () => void
}

export function StatsFilters({
  filters,
  onFiltersChange,
  onSubmit,
  onReset,
}: StatsFiltersProps) {
  function updateFilter<Key extends keyof StatsFilterDraft>(
    key: Key,
    value: StatsFilterDraft[Key],
  ) {
    onFiltersChange({ ...filters, [key]: value })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="rounded-lg border p-4" onSubmit={handleSubmit}>
      <FieldGroup className="grid gap-3 md:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="stats-started-at-from">开始时间</FieldLabel>
          <Input
            id="stats-started-at-from"
            type="datetime-local"
            value={filters.startedAtFrom}
            onChange={(event) =>
              updateFilter('startedAtFrom', event.target.value)
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="stats-started-at-to">结束时间</FieldLabel>
          <Input
            id="stats-started-at-to"
            type="datetime-local"
            value={filters.startedAtTo}
            onChange={(event) =>
              updateFilter('startedAtTo', event.target.value)
            }
          />
        </Field>

        <div className="flex items-end gap-2 md:col-span-2">
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
