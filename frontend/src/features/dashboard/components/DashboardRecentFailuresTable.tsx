import { ExternalLinkIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { DashboardRecentFailure } from '@/api/dashboard'
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
import {
  formatDateTime,
  formatDuration,
} from '@/features/caseReports/lib/formatters'

type DashboardRecentFailuresTableProps = {
  items: DashboardRecentFailure[]
}

export function DashboardRecentFailuresTable({
  items,
}: DashboardRecentFailuresTableProps) {
  return (
    <DataPanel
      title="最近失败用例"
      description="最近上报的失败或异常用例。"
      contentClassName="p-0"
    >
      <Table aria-label="最近失败用例">
        <TableHeader>
          <TableRow>
            <TableHead>开始时间</TableHead>
            <TableHead>用例</TableHead>
            <TableHead>模块</TableHead>
            <TableHead>执行机</TableHead>
            <TableHead>结果</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead>错误</TableHead>
            <TableHead>报告</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.caseReportId}>
              <TableCell>{formatDateTime(item.startedAt)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{item.caseName}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {item.caseId}
                  </span>
                </div>
              </TableCell>
              <TableCell>{item.module ?? '-'}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span>{item.runnerId}</span>
                  <span className="text-muted-foreground text-xs">
                    {item.runnerOwner}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <CaseResultBadge result={item.result} />
              </TableCell>
              <TableCell>{formatDuration(item.durationMs)}</TableCell>
              <TableCell>
                {item.errorType || item.errorMessage ? (
                  <div className="flex max-w-72 flex-col gap-1">
                    {item.errorType ? (
                      <span className="font-medium">{item.errorType}</span>
                    ) : null}
                    {item.errorMessage ? (
                      <span className="text-muted-foreground truncate text-sm">
                        {item.errorMessage}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Button asChild variant="link" size="sm" className="px-0">
                  <a href={item.reportUrl} target="_blank" rel="noreferrer">
                    报告
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                </Button>
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
