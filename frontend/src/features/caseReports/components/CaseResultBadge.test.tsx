import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { CaseResult } from '@/api/caseReports'

import { CaseResultBadge } from './CaseResultBadge'

const cases: Array<{ result: CaseResult; label: string }> = [
  { result: 'passed', label: '通过' },
  { result: 'failed', label: '失败' },
  { result: 'skipped', label: '跳过' },
  { result: 'blocked', label: '阻塞' },
  { result: 'error', label: '异常' },
]

describe('CaseResultBadge', () => {
  it.each(cases)(
    'renders $result as $label with a semantic result marker',
    ({ result, label }) => {
      render(<CaseResultBadge result={result} />)
      expect(screen.getByText(label)).toHaveAttribute('data-result', result)
    },
  )
})
