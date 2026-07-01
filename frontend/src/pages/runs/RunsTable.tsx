import { ExternalLinkIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { RunListItem, RunStatus } from '@/api/runs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  formatDateTime,
  formatDuration,
  formatPassRate,
  getStatusLabel,
} from './formatters'

type RunsTableProps = {
  items: RunListItem[]
}

function getStatusVariant(
  status: RunStatus,
): 'default' | 'destructive' | 'outline' {
  if (status === 'failed') {
    return 'destructive'
  }

  if (status === 'error') {
    return 'outline'
  }

  return 'default'
}

export function RunsTable({ items }: RunsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>开始时间</TableHead>
            <TableHead>执行机</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>耗时</TableHead>
            <TableHead className="text-right">总数</TableHead>
            <TableHead className="text-right">失败数</TableHead>
            <TableHead className="text-right">通过率</TableHead>
            <TableHead>报告</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.runId}>
              <TableCell>{formatDateTime(item.startedAt)}</TableCell>
              <TableCell>{item.runnerId}</TableCell>
              <TableCell>{item.runnerOwner}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(item.status)}>
                  {getStatusLabel(item.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatDuration(item.durationMs)}</TableCell>
              <TableCell className="text-right">{item.totalCount}</TableCell>
              <TableCell className="text-right">{item.failedCount}</TableCell>
              <TableCell className="text-right">
                {formatPassRate(item.passRate)}
              </TableCell>
              <TableCell>
                {item.reportUrl ? (
                  <Button asChild variant="link" size="sm" className="px-0">
                    <a href={item.reportUrl} target="_blank" rel="noreferrer">
                      报告
                      <ExternalLinkIcon data-icon="inline-end" />
                    </a>
                  </Button>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/runs/${item.runId}`}>查看详情</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
