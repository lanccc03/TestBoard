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

import type { StatsByDateItem } from '@/api/stats'
import { DataPanel } from '@/components/data-panel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCount, formatPassRate } from '@/features/stats/lib/formatters'

type StatsTrendSectionProps = {
  items: StatsByDateItem[]
}

type TooltipValue = number | string | Array<number | string>
type TooltipName = number | string

const trendChartColors = {
  total: 'var(--primary)',
  failure: 'var(--destructive)',
  passRate: 'var(--success)',
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
}: TooltipContentProps<TooltipValue, TooltipName>) {
  if (!active || payload.length === 0) {
    return null
  }

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      <div className="mb-2 font-medium">{label}</div>
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
              {formatTooltipValue(entry.dataKey, entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatsTrendSection({ items }: StatsTrendSectionProps) {
  const chartItems = items.map((item) => ({
    ...item,
    passRatePercent: item.passRate === null ? null : item.passRate * 100,
  }))

  return (
    <DataPanel
      title="日期趋势"
      description="按日期展示报告总数、失败数和通过率。"
      contentClassName="p-0"
    >
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
                content={(props) => <TrendTooltip {...props} />}
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
                <TableCell className="text-success font-medium">
                  {formatCount(item.passed)}
                </TableCell>
                <TableCell className="text-destructive font-medium">
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
    </DataPanel>
  )
}
