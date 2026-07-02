import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/request-state'
import { Button } from '@/components/ui/button'

export function CaseReportDetailPage() {
  const { caseReportId } = useParams()

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">用例报告详情</h2>
        <p className="text-muted-foreground text-sm">
          当前用例报告 ID：
          <span className="text-foreground font-mono">{caseReportId}</span>
        </p>
      </div>

      <EmptyState
        title="暂无用例报告详情"
        description="详情切片会在这里接入执行机、用例信息、错误信息和报告入口。"
        action={
          <Button asChild variant="outline">
            <Link to="/case-reports">返回用例报告</Link>
          </Button>
        }
      />
    </section>
  )
}
