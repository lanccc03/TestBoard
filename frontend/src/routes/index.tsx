import { Route, Routes } from 'react-router'

import { AppLayout } from '@/layouts/AppLayout'
import { CaseReportDetailPage } from '@/pages/CaseReportDetailPage'
import { CaseReportsPage } from '@/pages/caseReports/CaseReportsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FailuresPage } from '@/pages/FailuresPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="case-reports" element={<CaseReportsPage />} />
        <Route
          path="case-reports/:caseReportId"
          element={<CaseReportDetailPage />}
        />
        <Route path="failures" element={<FailuresPage />} />
      </Route>
    </Routes>
  )
}
