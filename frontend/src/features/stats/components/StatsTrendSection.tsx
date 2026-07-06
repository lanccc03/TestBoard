import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { StatsByDateItem } from '@/api/stats'
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

export function StatsTrendSection({ items }: StatsTrendSectionProps) {
  const chartItems = items.map((item) => ({
    ...item,
    passRatePercent: item.passRate === null ? null : item.passRate * 100,
  }))

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-normal">日期趋势</h3>
        <p className="text-muted-foreground text-sm">
          按日期展示报告总数、失败数和通过率。
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartItems}
              margin={{ top: 16, right: 24, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="count" allowDecimals={false} />
              <YAxis
                yAxisId="rate"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="count" dataKey="total" name="总数" fill="#2563eb" />
              <Bar
                yAxisId="count"
                dataKey="failureCount"
                name="失败数"
                fill="#dc2626"
              />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="passRatePercent"
                name="通过率"
                stroke="#16a34a"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table aria-label="日期趋势明细">
          <TableHeader>
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
                <TableCell>{formatCount(item.passed)}</TableCell>
                <TableCell>{formatCount(item.failed)}</TableCell>
                <TableCell>{formatCount(item.error)}</TableCell>
                <TableCell>{formatCount(item.skipped)}</TableCell>
                <TableCell>{formatCount(item.blocked)}</TableCell>
                <TableCell>{formatPassRate(item.passRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
