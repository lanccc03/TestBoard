import { useId, type ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type DataPanelProps = {
  title: string
  description?: string
  meta?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function DataPanel({
  title,
  description,
  meta,
  action,
  children,
  className,
  contentClassName,
}: DataPanelProps) {
  const titleId = useId()

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className={cn('overflow-hidden', className)}
    >
      <CardHeader className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle id={titleId} className="text-base">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
          {action ??
            (meta ? (
              <div className="text-muted-foreground text-sm">{meta}</div>
            ) : null)}
        </div>
      </CardHeader>
      <CardContent className={cn('p-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
