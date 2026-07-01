import { Route, Routes } from 'react-router'

import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { FailuresPage } from '@/pages/FailuresPage'
import { RunDetailPage } from '@/pages/RunDetailPage'
import { RunsPage } from '@/pages/RunsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="runs/:runId" element={<RunDetailPage />} />
        <Route path="failures" element={<FailuresPage />} />
      </Route>
    </Routes>
  )
}
