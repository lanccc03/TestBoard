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
    <div className="flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex items-center gap-3">
        <Spinner />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
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
    <Empty className="border">
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
    <Alert variant="destructive">
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
