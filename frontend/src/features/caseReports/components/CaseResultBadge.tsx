import type { CaseResult } from '@/api/caseReports'
import { Badge } from '@/components/ui/badge'
import { getResultLabel } from '@/features/caseReports/lib/formatters'

function getResultVariant(
  result: CaseResult,
): 'default' | 'destructive' | 'outline' {
  if (result === 'failed' || result === 'error') {
    return 'destructive'
  }

  if (result === 'skipped' || result === 'blocked') {
    return 'outline'
  }

  return 'default'
}

type CaseResultBadgeProps = {
  result: CaseResult
}

export function CaseResultBadge({ result }: CaseResultBadgeProps) {
  return (
    <Badge variant={getResultVariant(result)}>{getResultLabel(result)}</Badge>
  )
}
