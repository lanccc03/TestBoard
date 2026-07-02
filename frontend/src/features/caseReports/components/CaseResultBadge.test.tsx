import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CaseResult } from '@/api/caseReports'

import { CaseResultBadge } from './CaseResultBadge'

const cases: Array<{
  result: CaseResult
  label: string
  variant: string
}> = [
  { result: 'passed', label: '通过', variant: 'default' },
  { result: 'failed', label: '失败', variant: 'destructive' },
  { result: 'skipped', label: '跳过', variant: 'outline' },
  { result: 'blocked', label: '阻塞', variant: 'outline' },
  { result: 'error', label: '异常', variant: 'destructive' },
]

describe('CaseResultBadge', () => {
  it.each(cases)(
    'renders $result as $label with $variant variant',
    ({ result, label, variant }) => {
      render(<CaseResultBadge result={result} />)

      expect(screen.getByText(label)).toHaveAttribute('data-variant', variant)
    },
  )
})
