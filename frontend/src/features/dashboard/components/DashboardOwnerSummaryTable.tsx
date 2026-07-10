import type { DashboardOwnerSummary } from '@/api/dashboard'
import { DataPanel } from '@/components/data-panel'
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
    <DataPanel
      title="Owner 今日概览"
      description="按今日上报用例数量排序的 owner 质量概览。"
      contentClassName="p-0"
    >
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
              <TableCell className="font-medium">{item.runnerOwner}</TableCell>
              <TableCell>{item.total} 条</TableCell>
              <TableCell>{item.passed} 条</TableCell>
              <TableCell>{item.failed} 条</TableCell>
              <TableCell>{formatPassRate(item.passRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataPanel>
  )
}
