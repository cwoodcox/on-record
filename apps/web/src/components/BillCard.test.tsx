import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Bill } from '@on-record/types'
import { BillCard, BillCardSkeleton } from './BillCard'

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'HB0042',
    session: '2026GS',
    title: 'Utah Healthcare Access Act',
    summary: 'Expands Medicaid access for low-income residents',
    status: 'Enrolled',
    sponsorId: 'RRabbitt',
    voteResult: 'Pass',
    voteDate: '2026-02-15',
    ...overrides,
  }
}

describe('BillCard', () => {
  it('renders bill ID in the document', () => {
    render(<BillCard bill={makeBill()} />)
    expect(screen.getByText('HB0042')).toBeInTheDocument()
  })

  it('renders bill title in the document', () => {
    render(<BillCard bill={makeBill()} />)
    expect(screen.getByText('Utah Healthcare Access Act')).toBeInTheDocument()
  })

  it('renders theme pill when theme prop is provided', () => {
    render(<BillCard bill={makeBill()} theme="healthcare" />)
    expect(screen.getByText('healthcare')).toBeInTheDocument()
  })

  it('does not render theme pill when theme prop is omitted', () => {
    render(<BillCard bill={makeBill()} />)
    // No element with theme text — bill has no theme by default
    expect(screen.queryByText('healthcare')).not.toBeInTheDocument()
  })

  it('renders vote result and formatted vote date (muted) when bill.voteResult is defined', () => {
    render(<BillCard bill={makeBill({ voteResult: 'Pass', voteDate: '2026-02-15' })} />)
    expect(screen.getByText(/Pass · Feb 15, 2026/)).toBeInTheDocument()
  })

  it('does not render vote result section when bill.voteResult is undefined', () => {
    // Build a bill without optional fields — exactOptionalPropertyTypes forbids explicit undefined
    const bill: Bill = {
      id: 'HB0042',
      session: '2026GS',
      title: 'Utah Healthcare Access Act',
      summary: 'Expands Medicaid access for low-income residents',
      status: 'Enrolled',
      sponsorId: 'RRabbitt',
    }
    render(<BillCard bill={bill} />)
    expect(screen.queryByText(/Pass/)).not.toBeInTheDocument()
  })

  it('renders CitationTag — bill ID text appears inside', () => {
    render(<BillCard bill={makeBill()} />)
    // CitationTag renders "HB0042 · 2026 General Session · Feb 15, 2026"
    expect(screen.getByText(/HB0042 · 2026 General Session/)).toBeInTheDocument()
  })

  it('sets aria-label to the bill title', () => {
    render(<BillCard bill={makeBill()} />)
    expect(screen.getByLabelText('Utah Healthcare Access Act')).toBeInTheDocument()
  })

  it('does not render role="button" when selectable is false/undefined', () => {
    render(<BillCard bill={makeBill()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders role="button" with aria-pressed="false" when selectable and selected={false}', () => {
    render(<BillCard bill={makeBill()} selectable selected={false} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders aria-pressed="true" when selectable and selected={true}', () => {
    render(<BillCard bill={makeBill()} selectable selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onSelect on click when selectable', () => {
    const onSelect = vi.fn()
    render(<BillCard bill={makeBill()} selectable onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect on Enter key when selectable', () => {
    const onSelect = vi.fn()
    render(<BillCard bill={makeBill()} selectable onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('calls onSelect on Space key when selectable', () => {
    const onSelect = vi.fn()
    render(<BillCard bill={makeBill()} selectable onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('has min-h-[44px] class when selectable for touch target compliance', () => {
    render(<BillCard bill={makeBill()} selectable />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('min-h-[44px]')
  })
})

describe('BillCardSkeleton', () => {
  it('renders with aria-busy="true" (smoke test)', () => {
    const { container } = render(<BillCardSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('does not render any heading (no bill title shown)', () => {
    render(<BillCardSkeleton />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
