import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/request-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CaseResultBadge } from '@/features/caseReports/components/CaseResultBadge'
import {
  formatDateTime,
  formatDuration,
} from '@/features/caseReports/lib/formatters'
import { useCaseReportDetail } from '@/hooks/useCaseReportDetail'

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  const sizeKb = sizeBytes / 1024
  if (sizeKb < 1024) {
    return `${sizeKb.toFixed(1)} KB`
  }

  return `${(sizeKb / 1024).toFixed(1)} MB`
}

type DetailFieldProps = {
  label: string
  value: string
  mono?: boolean
}

function DetailField({ label, value, mono = false }: DetailFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={
          mono
            ? 'text-foreground truncate font-mono text-sm'
            : 'text-foreground truncate text-sm'
        }
      >
        {value}
      </dd>
    </div>
  )
}

type DetailSectionProps = {
  title: string
  children: ReactNode
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border p-5">
      <h3 className="text-base font-semibold tracking-normal">{title}</h3>
      {children}
    </section>
  )
}

export function CaseReportDetailPage() {
  const { caseReportId } = useParams()
  const caseReportQuery = useCaseReportDetail(caseReportId)
  const detail = caseReportQuery.data

  if (caseReportQuery.isPending && caseReportId) {
    return (
      <LoadingState
        title="加载用例报告详情"
        description="正在获取用例报告详情数据。"
      />
    )
  }

  if (caseReportQuery.isError) {
    return (
      <section className="flex flex-col gap-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/case-reports">
            <ArrowLeftIcon data-icon="inline-start" />
            返回用例报告
          </Link>
        </Button>
        <ErrorState
          error={caseReportQuery.error}
          retry={() => {
            void caseReportQuery.refetch()
          }}
        />
      </section>
    )
  }

  if (!caseReportId || !detail) {
    return (
      <section className="flex flex-col gap-6">
        <EmptyState
          title="暂无用例报告详情"
          description="请选择一条用例报告查看详情。"
          action={
            <Button asChild variant="outline">
              <Link to="/case-reports">返回用例报告</Link>
            </Button>
          }
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Button asChild variant="outline" className="mb-2 w-fit">
            <Link to="/case-reports">
              <ArrowLeftIcon data-icon="inline-start" />
              返回用例报告
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-normal">
              {detail.caseName}
            </h2>
            <CaseResultBadge result={detail.result} />
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            {detail.caseId}
          </p>
        </div>

        <Button asChild className="w-fit">
          <a href={detail.reportUrl} target="_blank" rel="noreferrer">
            打开报告
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        </Button>
      </div>

      <DetailSection title="用例信息">
        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="模块" value={detail.module ?? '-'} />
          <DetailField label="Owner 快照" value={detail.runnerOwner} />
          <DetailField
            label="开始时间"
            value={formatDateTime(detail.startedAt)}
          />
          <DetailField
            label="结束时间"
            value={formatDateTime(detail.endedAt)}
          />
          <DetailField label="耗时" value={formatDuration(detail.durationMs)} />
          <DetailField
            label="上报时间"
            value={formatDateTime(detail.createdAt)}
          />
          <DetailField label="报告 ID" value={detail.caseReportId} mono />
        </dl>
      </DetailSection>

      <DetailSection title="执行机">
        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="执行机 ID" value={detail.runner.runnerId} mono />
          <DetailField label="名称" value={detail.runner.runnerName ?? '-'} />
          <DetailField label="Owner" value={detail.runner.runnerOwner} />
          <DetailField label="IP" value={detail.runner.ip ?? '-'} mono />
        </dl>
      </DetailSection>

      <DetailSection title="错误信息">
        {detail.errorType || detail.errorMessage ? (
          <div className="flex flex-col gap-3">
            {detail.errorType ? (
              <Badge variant="destructive" className="w-fit">
                {detail.errorType}
              </Badge>
            ) : null}
            {detail.errorMessage ? (
              <pre className="bg-muted text-foreground overflow-auto rounded-md p-4 text-sm whitespace-pre-wrap">
                {detail.errorMessage}
              </pre>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">-</p>
        )}
      </DetailSection>

      <DetailSection title="报告文件">
        <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="文件名" value={detail.reportFilename} />
          <DetailField label="MIME" value={detail.reportContentType} />
          <DetailField
            label="大小"
            value={formatFileSize(detail.reportSizeBytes)}
          />
          <DetailField label="访问入口" value={detail.reportUrl} mono />
        </dl>
      </DetailSection>
    </section>
  )
}
