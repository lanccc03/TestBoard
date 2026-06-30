import { describe, expect, it } from 'vitest'

import { apiBaseUrl } from './config'

describe('apiBaseUrl', () => {
  it('defaults to the local backend when VITE_API_BASE_URL is not set', () => {
    expect(apiBaseUrl).toBe('http://localhost:8000')
  })
})
