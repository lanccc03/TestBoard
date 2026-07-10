import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type PageHeaderProps = {
  eyebrow?: ReactNode
  title: ReactNode
  description: string
  status?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  meta,
  action,
  className,
}: PageHeaderProps) {
  const titleId = useId()

  return (
    <header
      data-slot="page-header"
      aria-labelledby={titleId}
      className={cn('flex items-start justify-between gap-6', className)}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? (
          <div className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            {eyebrow}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          {status}
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm">{description}</p>
        {meta ? (
          <div className="text-muted-foreground text-xs">{meta}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
