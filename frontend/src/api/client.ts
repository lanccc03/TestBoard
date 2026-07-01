import createClient from 'openapi-fetch'

import { apiBaseUrl } from '@/lib/config'

import type { paths } from './schema'

export const apiClient = createClient<paths>({
  baseUrl: apiBaseUrl,
})
