import type { CaseResult } from '@/api/caseReports'
import { Badge } from '@/components/ui/badge'
import { getResultLabel } from '@/features/caseReports/lib/formatters'
import { cn } from '@/lib/utils'

const resultClasses: Record<CaseResult, string> = {
  passed: 'border-success/30 bg-success/10 text-success',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
  skipped: 'border-border bg-muted text-muted-foreground',
  blocked: 'border-warning/40 bg-warning/15 text-warning-foreground',
  error: 'border-error/30 bg-error/10 text-error',
}

type CaseResultBadgeProps = { result: CaseResult }

export function CaseResultBadge({ result }: CaseResultBadgeProps) {
  return (
    <Badge
      variant="outline"
      data-result={result}
      className={cn('gap-1.5 font-medium', resultClasses[result])}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {getResultLabel(result)}
    </Badge>
  )
}
