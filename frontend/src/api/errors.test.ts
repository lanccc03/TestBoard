import { describe, expect, it } from 'vitest'

import { getApiErrorMessage } from './errors'

describe('getApiErrorMessage', () => {
  it('returns string errors directly', () => {
    expect(getApiErrorMessage('Invalid report API token')).toBe(
      'Invalid report API token',
    )
  })

  it('returns Error messages directly', () => {
    expect(getApiErrorMessage(new Error('Network request failed'))).toBe(
      'Network request failed',
    )
  })

  it('reads FastAPI detail string responses', () => {
    expect(getApiErrorMessage({ detail: 'Invalid report API token' })).toBe(
      'Invalid report API token',
    )
  })

  it('formats FastAPI validation detail arrays', () => {
    expect(
      getApiErrorMessage({
        detail: [
          {
            loc: ['body', 'runner', 'runner_id'],
            msg: 'Field required',
            type: 'missing',
          },
        ],
      }),
    ).toBe('runner.runner_id: Field required')
  })

  it('falls back for unknown errors', () => {
    expect(getApiErrorMessage({ unexpected: true })).toBe(
      '请求失败，请稍后重试。',
    )
  })
})
