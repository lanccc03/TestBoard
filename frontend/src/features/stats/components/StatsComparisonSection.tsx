import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
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

export function StatsComparisonSection({
  title,
  description,
  tableLabel,
  items,
}: StatsComparisonSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="rounded-lg border p-3">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              margin={{ top: 16, right: 24, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="passed" name="通过" fill="#16a34a" />
              <Bar dataKey="failureCount" name="失败数" fill="#dc2626" />
              <Bar dataKey="skipped" name="跳过" fill="#ca8a04" />
              <Bar dataKey="blocked" name="阻塞" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table aria-label={tableLabel}>
          <TableHeader>
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
                <TableCell>{item.description ?? '-'}</TableCell>
                <TableCell>{formatCount(item.total)}</TableCell>
                <TableCell>{formatCount(item.passed)}</TableCell>
                <TableCell>{formatCount(item.failureCount)}</TableCell>
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
