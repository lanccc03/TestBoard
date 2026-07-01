const UNKNOWN_ERROR_MESSAGE = '请求失败，请稍后重试。'

type FastApiValidationDetail = {
  loc?: unknown[]
  msg?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function formatValidationLocation(loc: unknown[] | undefined): string {
  if (!loc) {
    return ''
  }

  return loc
    .filter((part) => part !== 'body' && part !== 'query' && part !== 'path')
    .map(String)
    .join('.')
}

function formatValidationDetail(detail: FastApiValidationDetail): string {
  const location = formatValidationLocation(detail.loc)
  const message =
    typeof detail.msg === 'string' && detail.msg.trim()
      ? detail.msg
      : UNKNOWN_ERROR_MESSAGE

  return location ? `${location}: ${message}` : message
}

export function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (!isRecord(error)) {
    return UNKNOWN_ERROR_MESSAGE
  }

  const { detail, message } = error

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .filter(isRecord)
      .map(formatValidationDetail)
      .filter(Boolean)
      .join('；')
  }

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  return UNKNOWN_ERROR_MESSAGE
}
