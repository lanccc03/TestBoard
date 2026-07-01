import { Link } from 'react-router'

import { EmptyState } from '@/components/request-state'
import { Button } from '@/components/ui/button'

export function RunsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">任务列表</h2>
        <p className="text-muted-foreground text-sm">
          任务列表查询切片会在这里接入筛选、分页和真实任务数据。
        </p>
      </div>

      <EmptyState
        title="暂无任务"
        description="上报链路已有数据入口，查询接口完成后这里会展示任务列表。"
        action={
          <Button asChild variant="outline">
            <Link to="/">返回首页</Link>
          </Button>
        }
      />
    </section>
  )
}
