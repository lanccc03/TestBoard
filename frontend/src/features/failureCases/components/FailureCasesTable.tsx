import { ExternalLinkIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { FailureCaseItem } from '@/api/failureCases'
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

type FailureCasesTableProps = {
  items: FailureCaseItem[]
}

export function FailureCasesTable({ items }: FailureCasesTableProps) {
  return (
    <Table aria-label="失败用例" className="table-fixed">
      <TableHeader className="bg-destructive/5">
        <TableRow>
          <TableHead className="w-[14%]">开始时间</TableHead>
          <TableHead className="w-[20%]">用例</TableHead>
          <TableHead className="w-[8%]">模块</TableHead>
          <TableHead className="w-[14%]">执行机 / Owner</TableHead>
          <TableHead className="w-[8%]">结果</TableHead>
          <TableHead className="w-[7%]">耗时</TableHead>
          <TableHead className="w-[16%]">错误</TableHead>
          <TableHead className="w-[13%] text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.caseReportId}>
            <TableCell>{formatDateTime(item.startedAt)}</TableCell>
            <TableCell>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-medium">{item.caseName}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {item.caseId}
                </span>
              </div>
            </TableCell>
            <TableCell>{item.module ?? '-'}</TableCell>
            <TableCell>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-mono text-xs">
                  {item.runnerId}
                </span>
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
                <div className="flex min-w-0 flex-col gap-1">
                  {item.errorType ? (
                    <span className="truncate font-medium">
                      {item.errorType}
                    </span>
                  ) : null}
                  {item.errorMessage ? (
                    <span className="text-muted-foreground truncate text-xs">
                      {item.errorMessage}
                    </span>
                  ) : null}
                </div>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="xs">
                  <a href={item.reportUrl} target="_blank" rel="noreferrer">
                    报告
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="xs">
                  <Link to={`/case-reports/${item.caseReportId}`}>
                    查看详情
                  </Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
