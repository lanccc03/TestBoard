import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type MetricTone = 'default' | 'success' | 'warning' | 'destructive'

export type MetricCardProps = {
  label: string
  value: ReactNode
  description?: ReactNode
  icon: LucideIcon
  tone?: MetricTone
  action?: ReactNode
}

const toneClasses: Record<MetricTone, string> = {
  default: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  destructive: 'border-l-destructive',
}

const iconClasses: Record<MetricTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive',
}

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'default',
  action,
}: MetricCardProps) {
  return (
    <Card
      role="article"
      aria-label={label}
      className={cn('border-l-4', toneClasses[tone])}
    >
      <CardContent className="flex min-h-32 flex-col justify-between gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'flex size-9 items-center justify-center rounded-lg',
              iconClasses[tone],
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div className="text-muted-foreground flex min-h-5 items-center justify-between gap-2 text-xs">
          <span>{description}</span>
          {action}
        </div>
      </CardContent>
    </Card>
  )
}
