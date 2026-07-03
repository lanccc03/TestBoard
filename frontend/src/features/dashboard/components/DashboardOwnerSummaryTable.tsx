import type { DashboardOwnerSummary } from '@/api/dashboard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPassRate } from '@/features/dashboard/lib/formatters'

type DashboardOwnerSummaryTableProps = {
  items: DashboardOwnerSummary[]
}

export function DashboardOwnerSummaryTable({
  items,
}: DashboardOwnerSummaryTableProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-normal">
          Owner 今日概览
        </h3>
        <p className="text-muted-foreground text-sm">
          按今日上报用例数量排序的 owner 质量概览。
        </p>
      </div>
      <div className="rounded-lg border">
        <Table aria-label="Owner 今日概览">
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>总数</TableHead>
              <TableHead>通过</TableHead>
              <TableHead>失败</TableHead>
              <TableHead>通过率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.runnerOwner}>
                <TableCell className="font-medium">
                  {item.runnerOwner}
                </TableCell>
                <TableCell>{item.total} 条</TableCell>
                <TableCell>{item.passed} 条</TableCell>
                <TableCell>{item.failed} 条</TableCell>
                <TableCell>{formatPassRate(item.passRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
