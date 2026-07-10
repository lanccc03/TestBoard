import { Link } from 'react-router'

import type { DashboardRecentRunner } from '@/api/dashboard'
import { DataPanel } from '@/components/data-panel'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CaseResultBadge } from '@/features/caseReports/components/CaseResultBadge'
import { formatDateTime } from '@/features/caseReports/lib/formatters'

type DashboardRecentRunnersTableProps = {
  items: DashboardRecentRunner[]
}

export function DashboardRecentRunnersTable({
  items,
}: DashboardRecentRunnersTableProps) {
  return (
    <DataPanel
      title="最近执行机"
      description="每台执行机最近一次用例上报结果。"
      contentClassName="p-0"
    >
      <Table aria-label="最近执行机">
        <TableHeader>
          <TableRow>
            <TableHead>最近上报</TableHead>
            <TableHead>执行机</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>最近用例</TableHead>
            <TableHead>结果</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.runnerId}>
              <TableCell>{formatDateTime(item.lastReportedAt)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {item.runnerName ?? item.runnerId}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {item.runnerId}
                  </span>
                </div>
              </TableCell>
              <TableCell>{item.runnerOwner}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{item.caseName}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {item.caseId}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <CaseResultBadge result={item.lastResult} />
              </TableCell>
              <TableCell>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/case-reports/${item.caseReportId}`}>
                    查看详情
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataPanel>
  )
}
