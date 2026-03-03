import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Legislator } from '@on-record/types'
import { LegislatorCard, LegislatorCardSkeleton } from './LegislatorCard'

const baseLegislator: Legislator = {
  id: 'leg-001',
  chamber: 'senate',
  district: 4,
  name: 'Jane Smith',
  email: 'jane.smith@le.utah.gov',
  phone: '(801) 555-0100',
  session: '2025GS',
}

describe('LegislatorCard', () => {
  it('renders legislator name as h2', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Jane Smith' })).toBeInTheDocument()
  })

  it('renders Senate chamber badge', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.getByText('Senate')).toBeInTheDocument()
  })

  it('renders House chamber badge for house legislator', () => {
    render(<LegislatorCard legislator={{ ...baseLegislator, chamber: 'house' }} />)
    expect(screen.getByText('House')).toBeInTheDocument()
  })

  it('renders district number', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.getByText('District 4')).toBeInTheDocument()
  })

  it('renders email as mailto anchor', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    const link = screen.getByRole('link', { name: 'jane.smith@le.utah.gov' })
    expect(link).toHaveAttribute('href', 'mailto:jane.smith@le.utah.gov')
  })

  it('renders phone label when phoneLabel is provided', () => {
    render(<LegislatorCard legislator={{ ...baseLegislator, phoneLabel: 'cell' }} />)
    expect(screen.getByText('(cell)')).toBeInTheDocument()
  })

  it('renders "number type unknown" flag when phoneTypeUnknown is true', () => {
    render(<LegislatorCard legislator={{ ...baseLegislator, phoneTypeUnknown: true }} />)
    expect(screen.getByText('number type unknown')).toBeInTheDocument()
  })

  it('does not render role="button" when not selectable', () => {
    render(<LegislatorCard legislator={baseLegislator} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders role="button" with aria-pressed="false" when selectable and not selected', () => {
    render(<LegislatorCard legislator={baseLegislator} selectable selected={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders aria-pressed="true" when selectable and selected', () => {
    render(<LegislatorCard legislator={baseLegislator} selectable selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onSelect when card is clicked (selectable)', () => {
    const onSelect = vi.fn()
    render(<LegislatorCard legislator={baseLegislator} selectable onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect when Enter key is pressed (selectable)', () => {
    const onSelect = vi.fn()
    render(<LegislatorCard legislator={baseLegislator} selectable onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect when Space key is pressed (selectable)', () => {
    const onSelect = vi.fn()
    render(<LegislatorCard legislator={baseLegislator} selectable onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onSelect).toHaveBeenCalledOnce()
  })
})

describe('LegislatorCardSkeleton', () => {
  it('renders without error (smoke test)', () => {
    const { container } = render(<LegislatorCardSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('does not render any heading (no legislator name)', () => {
    render(<LegislatorCardSkeleton />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('does not render any links (no email shown)', () => {
    render(<LegislatorCardSkeleton />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
