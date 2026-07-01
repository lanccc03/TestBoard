import type { RunStatus } from '@/api/runs'

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return '-'
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`
  }

  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds} 秒`
  }

  if (seconds === 0) {
    return `${minutes} 分钟`
  }

  return `${minutes} 分 ${seconds} 秒`
}

export function formatPassRate(passRate: number | null): string {
  if (passRate === null) {
    return '-'
  }

  return `${Math.round(passRate * 100)}%`
}

export function getStatusLabel(status: RunStatus): string {
  const labels: Record<RunStatus, string> = {
    passed: '通过',
    failed: '失败',
    error: '异常',
  }

  return labels[status]
}
