import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the TestBoard phase 0 shell with the configured API base URL', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'TestBoard' }),
    ).toBeInTheDocument()
    expect(screen.getByText('http://localhost:8000')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open health endpoint' }),
    ).toHaveAttribute('href', 'http://localhost:8000/health')
  })
})
