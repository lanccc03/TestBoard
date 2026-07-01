import { Link } from 'react-router'

import { EmptyState } from '@/components/request-state'
import { Button } from '@/components/ui/button'
import { apiBaseUrl } from '@/lib/config'

export function DashboardPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">首页看板</h2>
        <p className="text-muted-foreground text-sm">
          阶段 4 首页看板切片会在这里接入真实统计接口。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card text-card-foreground rounded-lg border p-5">
          <p className="text-muted-foreground text-sm">API base URL</p>
          <p className="mt-2 font-mono text-sm break-all">{apiBaseUrl}</p>
        </div>
        <div className="bg-card text-card-foreground rounded-lg border p-5">
          <p className="text-muted-foreground text-sm">Backend health</p>
          <p className="mt-2 font-mono text-sm break-all">
            {apiBaseUrl}/health
          </p>
        </div>
      </div>

      <EmptyState
        title="暂无看板数据"
        description="业务查询切片完成后，首页会展示当天质量概览和失败入口。"
        action={
          <Button asChild variant="outline">
            <Link to="/runs">查看任务列表</Link>
          </Button>
        }
      />
    </section>
  )
}
