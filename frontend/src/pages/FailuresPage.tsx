import { Link } from 'react-router'

import { EmptyState } from '@/components/request-state'
import { Button } from '@/components/ui/button'

export function FailuresPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal">失败用例</h2>
        <p className="text-muted-foreground text-sm">
          失败用例排查切片会在这里接入失败用例筛选、分页和关联用例报告跳转。
        </p>
      </div>

      <EmptyState
        title="暂无失败用例"
        description="失败用例查询接口完成后，这里会展示错误类型、错误信息和报告入口。"
        action={
          <Button asChild variant="outline">
            <Link to="/case-reports">查看用例报告</Link>
          </Button>
        }
      />
    </section>
  )
}
