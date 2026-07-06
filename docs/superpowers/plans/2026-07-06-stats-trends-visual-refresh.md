# Stats Trends Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the stats trends page into a light status dashboard with summary metrics, clearer charts, and more readable comparison panels.

**Architecture:** Keep `StatsPage` as the route owner for filter/query state and add display-only derived summary metrics there. Keep chart and table rendering inside the existing stats feature components so the UI changes stay localized. Do not change API clients, hooks, routes, or backend behavior.

**Tech Stack:** React 19, TypeScript, Vite, shadcn/ui, Tailwind CSS v4, Recharts 3.3.0, lucide-react, Vitest, Testing Library.

---

## File Structure

- Modify: `frontend/src/pages/StatsPage.tsx`
  - Derive summary metrics from loaded date stats.
  - Render the refreshed page header, statistics window badge, and summary metric cards.
  - Keep filter state, query state, loading state, error state, empty state, and existing data flow unchanged.
- Modify: `frontend/src/pages/StatsPage.test.tsx`
  - Add assertions for the new summary area.
  - Keep existing loading, error, empty, chart, table, submit, and reset coverage.
- Modify: `frontend/src/features/stats/components/StatsFilters.tsx`
  - Refine the existing form container and responsive action layout.
  - Keep props and submit/reset behavior unchanged.
- Modify: `frontend/src/features/stats/components/StatsTrendSection.tsx`
  - Add local chart styling constants.
  - Add a custom Recharts tooltip for formatted counts and pass rate.
  - Improve trend chart and detail table styling.
- Modify: `frontend/src/features/stats/components/StatsComparisonSection.tsx`
  - Add local chart styling constants.
  - Add a custom Recharts tooltip for comparison charts.
  - Improve comparison chart and table styling while keeping the component props unchanged.

Do not stage `.superpowers/`; it is visual companion scratch content.

---

### Task 1: Add Summary Metric Coverage

**Files:**
- Modify: `frontend/src/pages/StatsPage.test.tsx`

- [ ] **Step 1: Add failing assertions to the existing render test**

In `frontend/src/pages/StatsPage.test.tsx`, inside `it('renders charts and comparison tables', () => { ... })`, add these assertions after the existing heading assertion:

```tsx
const summary = screen.getByLabelText('统计概览')
expect(within(summary).getByText('报告总数')).toBeInTheDocument()
expect(within(summary).getByText('3 条')).toBeInTheDocument()
expect(within(summary).getByText('失败风险')).toBeInTheDocument()
expect(within(summary).getByText('2 条')).toBeInTheDocument()
expect(within(summary).getByText('通过率')).toBeInTheDocument()
expect(within(summary).getByText('33.3%')).toBeInTheDocument()
expect(within(summary).getByText('阻塞 / 异常')).toBeInTheDocument()
expect(within(summary).getByText('1 条')).toBeInTheDocument()
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm test -- src/pages/StatsPage.test.tsx -t "renders charts and comparison tables"
```

Expected result: the test fails because no element is labelled `统计概览`.

---

### Task 2: Add the Stats Page Header and Summary Cards

**Files:**
- Modify: `frontend/src/pages/StatsPage.tsx`
- Modify: `frontend/src/pages/StatsPage.test.tsx`

- [ ] **Step 1: Add imports for summary UI**

In `frontend/src/pages/StatsPage.tsx`, update imports so the file has these additional imports:

```tsx
import {
  ActivityIcon,
  BarChart3Icon,
  CircleAlertIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from 'lucide-react'

import type { StatsByDateItem, StatsQuery } from '@/api/stats'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
```

The existing `StatsQuery` import should be replaced by the combined `StatsByDateItem, StatsQuery` type import.

- [ ] **Step 2: Add summary metric helpers**

In `frontend/src/pages/StatsPage.tsx`, below `EMPTY_FILTERS`, add:

```tsx
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
      failureCount: accumulator.failureCount + item.failureCount,
      blockedAndError: accumulator.blockedAndError + item.blocked + item.error,
    }),
    {
      totalReports: 0,
      passed: 0,
      failureCount: 0,
      blockedAndError: 0,
    },
  )

  return {
    totalReports: totals.totalReports,
    failureCount: totals.failureCount,
    passRate:
      totals.totalReports === 0 ? null : totals.passed / totals.totalReports,
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
```

- [ ] **Step 3: Render the refreshed page header and optional summary area**

In `StatsPage`, derive `summary` before `return` by adding this after `isEmpty`:

```tsx
  const summary = byDateData ? buildStatsSummary(byDateData.items) : null
```

Then replace the current top-level page header block:

```tsx
<div className="flex flex-col gap-2">
  <h2 className="text-2xl font-semibold tracking-normal">统计趋势</h2>
  <p className="text-muted-foreground text-sm">
    展示日期趋势，以及 owner、执行机、用例维度的 Top 10 对比。
  </p>
</div>
```

with:

```tsx
<div className="rounded-lg border bg-card p-5 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">统计趋势</h2>
        {summary ? (
          <Badge
            variant={summary.failureCount > 0 ? 'destructive' : 'secondary'}
          >
            {summary.failureCount > 0 ? '存在失败' : '状态稳定'}
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">
        展示日期趋势，以及 owner、执行机、用例维度的 Top 10 对比。
      </p>
    </div>

    {byDateData ? (
      <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        统计窗口：{formatDateTime(byDateData.range.startedAtFrom)} 至{' '}
        {formatDateTime(byDateData.range.startedAtTo)}
      </div>
    ) : null}
  </div>

  {summary ? (
    <section
      aria-label="统计概览"
      className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
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
        description="按报告总数加权计算"
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
```

Also add `formatCount` and `formatPassRate` to the existing formatter import:

```tsx
import { formatCount, formatPassRate } from '@/features/stats/lib/formatters'
```

- [ ] **Step 4: Remove the old loaded statistics window line**

Inside the loaded-data branch, remove this old line because the refreshed header now owns the statistics window display:

```tsx
<div className="text-muted-foreground text-sm">
  统计窗口：{formatDateTime(byDateData.range.startedAtFrom)} 至{' '}
  {formatDateTime(byDateData.range.startedAtTo)}
</div>
```

- [ ] **Step 5: Run the focused test**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm test -- src/pages/StatsPage.test.tsx -t "renders charts and comparison tables"
```

Expected result: the focused test passes.

- [ ] **Step 6: Commit summary UI**

Run:

```bash
cd /Users/lanyy/Code/TestBoard
git status --short
git add frontend/src/pages/StatsPage.tsx frontend/src/pages/StatsPage.test.tsx
git commit -m "feat: add stats summary cards"
```

Expected result: a commit containing only `StatsPage.tsx` and `StatsPage.test.tsx`. `.superpowers/` remains unstaged.

---

### Task 3: Refine the Filter Control Panel

**Files:**
- Modify: `frontend/src/features/stats/components/StatsFilters.tsx`

- [ ] **Step 1: Update the form container and responsive action layout**

In `frontend/src/features/stats/components/StatsFilters.tsx`, replace the returned form markup with:

```tsx
return (
  <form
    className="rounded-lg border bg-card/80 p-4 shadow-sm"
    onSubmit={handleSubmit}
  >
    <FieldGroup className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
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

      <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
        <Button type="submit" className="w-full sm:w-auto">
          <SearchIcon data-icon="inline-start" />
          筛选
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onReset}
        >
          <RotateCcwIcon data-icon="inline-start" />
          重置
        </Button>
      </div>
    </FieldGroup>
  </form>
)
```

- [ ] **Step 2: Run the filter behavior test**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm test -- src/pages/StatsPage.test.tsx -t "submits and resets the time range filters"
```

Expected result: the focused test passes.

- [ ] **Step 3: Commit filter styling**

Run:

```bash
cd /Users/lanyy/Code/TestBoard
git status --short
git add frontend/src/features/stats/components/StatsFilters.tsx
git commit -m "style: refine stats filters panel"
```

Expected result: a commit containing only `StatsFilters.tsx`. `.superpowers/` remains unstaged.

---

### Task 4: Polish the Date Trend Panel

**Files:**
- Modify: `frontend/src/features/stats/components/StatsTrendSection.tsx`
- Test: `frontend/src/pages/StatsPage.test.tsx`

- [ ] **Step 1: Add tooltip typing and chart constants**

In `frontend/src/features/stats/components/StatsTrendSection.tsx`, update the Recharts import to include `type TooltipContentProps`:

```tsx
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts'
```

Then add these constants and helpers below the props type:

```tsx
type TooltipValue = number | string | Array<number | string>

const trendChartColors = {
  total: '#0f172a',
  failure: '#dc2626',
  passRate: '#16a34a',
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
}

function formatTooltipValue(dataKey: unknown, value: unknown): string {
  if (typeof value !== 'number') {
    return String(value ?? '-')
  }

  if (dataKey === 'passRatePercent') {
    return `${value.toFixed(1)}%`
  }

  return formatCount(value)
}

function TrendTooltip({
  active,
  label,
  payload,
}: TooltipContentProps<TooltipValue, string>) {
  if (!active || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="mb-2 font-medium">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey ?? entry.name}`}
            className="flex min-w-32 items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color ?? entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-medium">
              {formatTooltipValue(entry.dataKey, entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the trend section layout**

In the same file, replace the current returned JSX with this structure:

```tsx
return (
  <section className="rounded-lg border bg-card shadow-sm">
    <div className="flex flex-col gap-1 border-b px-5 py-4">
      <h3 className="text-lg font-semibold tracking-normal">日期趋势</h3>
      <p className="text-muted-foreground text-sm">
        按日期展示报告总数、失败数和通过率。
      </p>
    </div>

    <div className="p-4">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartItems}
            margin={{ top: 16, right: 24, bottom: 12, left: 8 }}
          >
            <CartesianGrid
              stroke={trendChartColors.grid}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={24}
              stroke={trendChartColors.axis}
            />
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              width={48}
              stroke={trendChartColors.axis}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              width={48}
              tickFormatter={(value) => `${value}%`}
              stroke={trendChartColors.axis}
            />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: 12 }} />
            <Bar
              yAxisId="count"
              dataKey="total"
              name="总数"
              fill={trendChartColors.total}
              radius={[6, 6, 0, 0]}
              barSize={24}
            />
            <Bar
              yAxisId="count"
              dataKey="failureCount"
              name="失败数"
              fill={trendChartColors.failure}
              radius={[6, 6, 0, 0]}
              barSize={24}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="passRatePercent"
              name="通过率"
              stroke={trendChartColors.passRate}
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="border-t">
      <Table aria-label="日期趋势明细">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead>总数</TableHead>
            <TableHead>通过</TableHead>
            <TableHead>失败</TableHead>
            <TableHead>异常</TableHead>
            <TableHead>跳过</TableHead>
            <TableHead>阻塞</TableHead>
            <TableHead>通过率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.date}>
              <TableCell className="font-medium">{item.date}</TableCell>
              <TableCell>{formatCount(item.total)}</TableCell>
              <TableCell className="font-medium text-emerald-700">
                {formatCount(item.passed)}
              </TableCell>
              <TableCell className="font-medium text-destructive">
                {formatCount(item.failed)}
              </TableCell>
              <TableCell>{formatCount(item.error)}</TableCell>
              <TableCell>{formatCount(item.skipped)}</TableCell>
              <TableCell>{formatCount(item.blocked)}</TableCell>
              <TableCell className="font-medium">
                {formatPassRate(item.passRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </section>
)
```

- [ ] **Step 3: Run the render test**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm test -- src/pages/StatsPage.test.tsx -t "renders charts and comparison tables"
```

Expected result: the focused test passes and still finds 4 chart containers.

- [ ] **Step 4: Commit trend panel styling**

Run:

```bash
cd /Users/lanyy/Code/TestBoard
git status --short
git add frontend/src/features/stats/components/StatsTrendSection.tsx
git commit -m "style: polish stats trend chart"
```

Expected result: a commit containing only `StatsTrendSection.tsx`. `.superpowers/` remains unstaged.

---

### Task 5: Polish Comparison Panels

**Files:**
- Modify: `frontend/src/features/stats/components/StatsComparisonSection.tsx`
- Test: `frontend/src/pages/StatsPage.test.tsx`

- [ ] **Step 1: Add tooltip typing, constants, and label helpers**

In `frontend/src/features/stats/components/StatsComparisonSection.tsx`, update the Recharts import to include `type TooltipContentProps`:

```tsx
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts'
```

Then add these helpers below the props type:

```tsx
type TooltipValue = number | string | Array<number | string>

const comparisonChartColors = {
  passed: '#16a34a',
  failureCount: '#dc2626',
  skipped: '#ca8a04',
  blocked: '#64748b',
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
}

function formatAxisLabel(value: string): string {
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
}

function ComparisonTooltip({
  active,
  label,
  payload,
}: TooltipContentProps<TooltipValue, string>) {
  if (!active || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="mb-2 max-w-52 font-medium">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey ?? entry.name}`}
            className="flex min-w-32 items-center justify-between gap-4"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color ?? entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-medium">
              {typeof entry.value === 'number'
                ? formatCount(entry.value)
                : String(entry.value ?? '-')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the comparison section layout**

In the same file, replace the current returned JSX with:

```tsx
return (
  <section className="rounded-lg border bg-card shadow-sm">
    <div className="flex flex-col gap-1 border-b px-5 py-4">
      <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>

    <div className="p-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={items}
            margin={{ top: 16, right: 24, bottom: 20, left: 8 }}
          >
            <CartesianGrid
              stroke={comparisonChartColors.grid}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              height={54}
              interval={0}
              tickFormatter={formatAxisLabel}
              stroke={comparisonChartColors.axis}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              width={48}
              stroke={comparisonChartColors.axis}
            />
            <Tooltip
              content={<ComparisonTooltip />}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: 12 }} />
            <Bar
              dataKey="passed"
              name="通过"
              fill={comparisonChartColors.passed}
              radius={[5, 5, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="failureCount"
              name="失败数"
              fill={comparisonChartColors.failureCount}
              radius={[5, 5, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="skipped"
              name="跳过"
              fill={comparisonChartColors.skipped}
              radius={[5, 5, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="blocked"
              name="阻塞"
              fill={comparisonChartColors.blocked}
              radius={[5, 5, 0, 0]}
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="border-t">
      <Table aria-label={tableLabel}>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>对象</TableHead>
            <TableHead>说明</TableHead>
            <TableHead>总数</TableHead>
            <TableHead>通过</TableHead>
            <TableHead>失败数</TableHead>
            <TableHead>跳过</TableHead>
            <TableHead>阻塞</TableHead>
            <TableHead>通过率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.label}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.description ?? '-'}
              </TableCell>
              <TableCell>{formatCount(item.total)}</TableCell>
              <TableCell className="font-medium text-emerald-700">
                {formatCount(item.passed)}
              </TableCell>
              <TableCell className="font-medium text-destructive">
                {formatCount(item.failureCount)}
              </TableCell>
              <TableCell>{formatCount(item.skipped)}</TableCell>
              <TableCell>{formatCount(item.blocked)}</TableCell>
              <TableCell className="font-medium">
                {formatPassRate(item.passRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </section>
)
```

- [ ] **Step 3: Run the render test**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm test -- src/pages/StatsPage.test.tsx -t "renders charts and comparison tables"
```

Expected result: the focused test passes and the owner table remains accessible as `Owner 统计对比`.

- [ ] **Step 4: Commit comparison panel styling**

Run:

```bash
cd /Users/lanyy/Code/TestBoard
git status --short
git add frontend/src/features/stats/components/StatsComparisonSection.tsx
git commit -m "style: polish stats comparison panels"
```

Expected result: a commit containing only `StatsComparisonSection.tsx`. `.superpowers/` remains unstaged.

---

### Task 6: Full Verification and Visual Check

**Files:**
- Verify: `frontend/src/pages/StatsPage.tsx`
- Verify: `frontend/src/features/stats/components/StatsFilters.tsx`
- Verify: `frontend/src/features/stats/components/StatsTrendSection.tsx`
- Verify: `frontend/src/features/stats/components/StatsComparisonSection.tsx`
- Verify: `frontend/src/pages/StatsPage.test.tsx`

- [ ] **Step 1: Run frontend quality checks**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Expected result: all four commands pass.

- [ ] **Step 2: Start the frontend dev server for visual verification**

Run:

```bash
cd /Users/lanyy/Code/TestBoard/frontend
pnpm dev
```

Expected result: Vite prints a local URL, usually `http://localhost:5173/`. Keep the server running while checking the page.

- [ ] **Step 3: Verify the stats page in the browser**

Open:

```text
http://localhost:5173/stats
```

Check these visible outcomes:

- The global header and navigation remain light.
- The stats page heading is visible once.
- The loaded stats view has a summary panel with `报告总数`, `失败风险`, `通过率`, and `阻塞 / 异常`.
- The filter panel remains directly available below the page header area.
- The date trend chart is the strongest visual anchor.
- Owner, runner, and case comparison sections keep their chart plus table structure.
- Table text does not overlap on the current desktop viewport.

- [ ] **Step 4: Stop the dev server**

Stop the Vite process with `Ctrl-C`.

Expected result: no frontend server remains running from this task.

- [ ] **Step 5: Review final git state**

Run:

```bash
cd /Users/lanyy/Code/TestBoard
git status --short
```

Expected result: only intentional source changes are present. `.superpowers/` remains unstaged.

- [ ] **Step 6: Commit any verification fixes**

If Step 1 or Step 3 required source fixes, commit them:

```bash
cd /Users/lanyy/Code/TestBoard
git add frontend/src/pages/StatsPage.tsx frontend/src/features/stats/components/StatsFilters.tsx frontend/src/features/stats/components/StatsTrendSection.tsx frontend/src/features/stats/components/StatsComparisonSection.tsx frontend/src/pages/StatsPage.test.tsx
git commit -m "fix: stabilize stats visual refresh"
```

Expected result: a commit exists only when source fixes were made during verification. Do not create this commit when no files changed.
