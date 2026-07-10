import { AlertCircleIcon, InboxIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { getApiErrorMessage } from '@/api/errors'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

type LoadingStateProps = {
  title?: string
  description?: string
}

export function LoadingState({
  title = '加载中',
  description,
}: LoadingStateProps) {
  return (
    <div className="bg-card flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          <Spinner />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty className="bg-card min-h-64 border border-dashed shadow-sm">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

type ErrorStateProps = {
  error: unknown
  title?: string
  retry?: () => void
}

export function ErrorState({
  error,
  title = '请求失败',
  retry,
}: ErrorStateProps) {
  return (
    <Alert
      variant="destructive"
      className="bg-card border-l-destructive border-l-4 px-4 py-3 shadow-sm"
    >
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
      {retry ? (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={retry}>
            重试
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  )
}
