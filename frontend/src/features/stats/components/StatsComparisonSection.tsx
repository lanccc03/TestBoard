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

import type { StatsCounts } from '@/api/stats'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCount, formatPassRate } from '@/features/stats/lib/formatters'

export type StatsComparisonItem = StatsCounts & {
  id: string
  label: string
  description: string | null
}

type StatsComparisonSectionProps = {
  title: string
  description: string
  tableLabel: string
  items: StatsComparisonItem[]
}

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
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      <div className="mb-2 max-w-52 font-medium">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey ?? entry.name}`}
            className="flex min-w-32 items-center justify-between gap-4"
          >
            <span className="text-muted-foreground flex items-center gap-2">
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

export function StatsComparisonSection({
  title,
  description,
  tableLabel,
  items,
}: StatsComparisonSectionProps) {
  return (
    <section className="bg-card rounded-lg border shadow-sm">
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
              <Tooltip<TooltipValue, string>
                content={(props) => <ComparisonTooltip {...props} />}
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
                <TableCell className="text-destructive font-medium">
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
}
