import { Activity } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

import { cn } from '@/lib/utils'

const navigationItems = [
  { label: '首页', to: '/', end: true },
  { label: '用例报告', to: '/case-reports', end: false },
  { label: '失败用例', to: '/failures', end: false },
]

export function AppLayout() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="bg-background border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg border">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-normal">
                TestBoard
              </h1>
              <p className="text-muted-foreground text-sm">基础应用框架薄版</p>
            </div>
          </div>

          <nav aria-label="主导航" className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive && 'bg-muted text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
