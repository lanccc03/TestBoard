const DEFAULT_API_BASE_URL = 'http://localhost:8000'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = stripTrailingSlash(
  configuredApiBaseUrl || DEFAULT_API_BASE_URL,
)
