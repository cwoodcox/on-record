import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CitationTag } from './CitationTag'

describe('CitationTag', () => {
  it('renders billId · sessionLabel when voteDate is undefined', () => {
    render(<CitationTag billId="HB0042" session="2026GS" />)
    expect(screen.getByText('HB0042 · 2026 General Session')).toBeInTheDocument()
  })

  it('renders billId · sessionLabel · dateLabel when voteDate is provided', () => {
    render(<CitationTag billId="HB0042" session="2026GS" voteDate="2026-02-15" />)
    expect(screen.getByText('HB0042 · 2026 General Session · Feb 15, 2026')).toBeInTheDocument()
  })

  it('formats "2026GS" → "2026 General Session"', () => {
    render(<CitationTag billId="SB0010" session="2026GS" />)
    expect(screen.getByText(/2026 General Session/)).toBeInTheDocument()
  })

  it('formats "2025GS" → "2025 General Session"', () => {
    render(<CitationTag billId="SB0010" session="2025GS" />)
    expect(screen.getByText(/2025 General Session/)).toBeInTheDocument()
  })

  it('formats "2026SS" → "2026 Special Session"', () => {
    render(<CitationTag billId="SB0010" session="2026SS" />)
    expect(screen.getByText(/2026 Special Session/)).toBeInTheDocument()
  })

  it('formats unknown session suffix as raw fallback', () => {
    render(<CitationTag billId="SB0010" session="2026S1" />)
    expect(screen.getByText(/2026 S1/)).toBeInTheDocument()
  })

  it('formats voteDate "2026-03-01" as "Mar 1, 2026" without timezone off-by-one', () => {
    render(<CitationTag billId="HB0042" session="2026GS" voteDate="2026-03-01" />)
    // If parsed as local time in UTC-7, this would show Feb 28 — the UTC fix prevents this
    expect(screen.getByText(/Mar 1, 2026/)).toBeInTheDocument()
  })
})
