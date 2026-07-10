import {
  ActivityIcon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

import { cn } from '@/lib/utils'

const navigationItems = [
  { label: '首页', to: '/', end: true, icon: LayoutDashboardIcon },
  {
    label: '用例报告',
    to: '/case-reports',
    end: false,
    icon: ClipboardListIcon,
  },
  { label: '失败用例', to: '/failures', end: false, icon: TriangleAlertIcon },
  {
    label: '统计趋势',
    to: '/stats',
    end: false,
    icon: ChartNoAxesCombinedIcon,
  },
]

export function AppLayout() {
  return (
    <div className="bg-workspace text-foreground flex min-h-svh min-w-[1280px]">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 flex h-svh w-56 shrink-0 flex-col border-r px-4 py-5">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-sm">
            <ActivityIcon className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">TestBoard</h1>
            <p className="text-muted-foreground text-xs">质量工作台</p>
          </div>
        </div>

        <p className="text-muted-foreground mt-8 px-3 text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
          工作区
        </p>
        <nav aria-label="主导航" className="mt-2 flex flex-col gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive &&
                      'bg-sidebar-accent text-sidebar-primary shadow-[inset_3px_0_0_var(--sidebar-primary)]',
                  )
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="bg-muted/60 mt-auto rounded-xl border p-3">
          <p className="text-sm font-medium">TestBoard</p>
          <p className="text-muted-foreground mt-1 text-xs">
            公司内网测试结果平台
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-7">
        <div className="min-w-[1000px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
