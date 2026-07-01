import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/request-state'
import { Button } from '@/components/ui/button'

export function RunDetailPage() {
  const { runId } = useParams()

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">任务详情</h2>
        <p className="text-muted-foreground text-sm">
          当前任务 ID：
          <span className="text-foreground font-mono">{runId}</span>
        </p>
      </div>

      <EmptyState
        title="暂无任务详情"
        description="任务详情与用例明细切片会在这里接入基础信息、汇总结果和用例列表。"
        action={
          <Button asChild variant="outline">
            <Link to="/runs">返回任务列表</Link>
          </Button>
        }
      />
    </section>
  )
}
