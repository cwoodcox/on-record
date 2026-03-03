// apps/web/src/components/ErrorBanner.test.tsx
// Unit tests for ErrorBanner component — Vitest + React Testing Library.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBanner } from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders source badge, message, and action correctly', () => {
    render(
      <ErrorBanner
        source="gis-api"
        message="P.O. Box addresses cannot be geocoded"
        action="Use your street address instead"
        onAction={() => {}}
      />,
    )
    expect(screen.getByText('gis-api')).toBeInTheDocument()
    expect(screen.getByText('P.O. Box addresses cannot be geocoded')).toBeInTheDocument()
    expect(screen.getByText('Use your street address instead')).toBeInTheDocument()
  })

  it('has role="alert" for immediate screen reader announcement', () => {
    render(<ErrorBanner source="gis-api" message="Error" action="Try again" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('calls onAction callback when action button is clicked', async () => {
    const onAction = vi.fn()
    render(
      <ErrorBanner source="gis-api" message="Error" action="Try again" onAction={onAction} />,
    )
    await userEvent.click(screen.getByText('Try again'))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('renders anchor link when actionHref provided and onAction omitted', () => {
    render(
      <ErrorBanner source="gis-api" message="Error" action="Visit help" actionHref="/help" />,
    )
    const link = screen.getByRole('link', { name: 'Visit help' })
    expect(link).toHaveAttribute('href', '/help')
  })

  it('renders action as plain text when neither onAction nor actionHref is provided', () => {
    render(
      <ErrorBanner
        source="gis-api"
        message="Service unavailable"
        action="Wait a moment and try again"
      />,
    )
    expect(screen.getByText('Wait a moment and try again')).toBeInTheDocument()
    // No button or link rendered
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('action button meets 44px touch target requirement (min-h-[44px] class)', () => {
    render(
      <ErrorBanner
        source="gis-api"
        message="Error"
        action="Correct address"
        onAction={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: 'Correct address' })
    expect(button.className).toContain('min-h-[44px]')
  })
})
