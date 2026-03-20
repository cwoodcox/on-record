import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { CitationTagProps } from './CitationTag'
import { DraftCard, DraftCardSkeleton } from './DraftCard'

const baseCitation: CitationTagProps = { billId: 'HB0042', session: '2026GS', voteDate: '2026-02-15' }

function makeProps(overrides: Partial<Parameters<typeof DraftCard>[0]> = {}): Parameters<typeof DraftCard>[0] {
  return {
    medium: 'email',
    formality: 'conversational',
    draftBody: 'Dear Representative,\n\nI am writing to express my concern.',
    citation: baseCitation,
    ...overrides,
  }
}

describe('DraftCard', () => {
  it('renders medium badge "Email" when medium="email"', () => {
    render(<DraftCard {...makeProps({ medium: 'email' })} />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders medium badge "Text / SMS" when medium="text"', () => {
    render(<DraftCard {...makeProps({ medium: 'text' })} />)
    expect(screen.getByText('Text / SMS')).toBeInTheDocument()
  })

  it('renders formality badge "Conversational" when formality="conversational"', () => {
    render(<DraftCard {...makeProps({ formality: 'conversational' })} />)
    expect(screen.getByText('Conversational')).toBeInTheDocument()
  })

  it('renders formality badge "Formal" when formality="formal"', () => {
    render(<DraftCard {...makeProps({ formality: 'formal' })} />)
    expect(screen.getByText('Formal')).toBeInTheDocument()
  })

  it('renders AI disclosure placeholder text', () => {
    render(<DraftCard {...makeProps()} />)
    expect(screen.getByText('AI-generated draft')).toBeInTheDocument()
  })

  it('AI disclosure is a span element (not a button/link)', () => {
    render(<DraftCard {...makeProps()} />)
    const disclosure = screen.getByText('AI-generated draft')
    expect(disclosure.tagName.toLowerCase()).toBe('span')
  })

  it('draft body is not wrapped in a button', () => {
    render(<DraftCard {...makeProps()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders CitationTag with billId text', () => {
    render(<DraftCard {...makeProps()} />)
    // CitationTag renders "HB0042 · 2026 General Session · Feb 15, 2026"
    expect(screen.getByText(/HB0042/)).toBeInTheDocument()
  })

  it('does NOT show character count when medium="text" and draftBody < 130 chars', () => {
    const shortDraft = 'A'.repeat(100) // 100 chars < 130
    render(<DraftCard {...makeProps({ medium: 'text', draftBody: shortDraft })} />)
    expect(screen.queryByText(/\/160/)).not.toBeInTheDocument()
  })

  it('shows {N}/160 character count when medium="text" and draftBody >= 130 chars', () => {
    const longDraft = 'A'.repeat(135) // 135 chars >= 130
    render(<DraftCard {...makeProps({ medium: 'text', draftBody: longDraft })} />)
    expect(screen.getByText('135/160')).toBeInTheDocument()
  })

  it('shows character count at exactly 130 chars', () => {
    const draft = 'A'.repeat(130)
    render(<DraftCard {...makeProps({ medium: 'text', draftBody: draft })} />)
    expect(screen.getByText('130/160')).toBeInTheDocument()
  })

  it('does NOT show character count when medium="email" even if draftBody >= 130 chars', () => {
    const longDraft = 'A'.repeat(135)
    render(<DraftCard {...makeProps({ medium: 'email', draftBody: longDraft })} />)
    expect(screen.queryByText(/\/160/)).not.toBeInTheDocument()
  })

  it('applies opacity class when isRevising=true', () => {
    const { container } = render(<DraftCard {...makeProps({ isRevising: true })} />)
    const opacityEl = container.querySelector('.opacity-60')
    expect(opacityEl).toBeInTheDocument()
  })

  it('does not apply opacity class when isRevising is not set', () => {
    const { container } = render(<DraftCard {...makeProps()} />)
    const opacityEl = container.querySelector('.opacity-60')
    expect(opacityEl).not.toBeInTheDocument()
  })

  it('does not apply opacity class when isRevising=false', () => {
    const { container } = render(<DraftCard {...makeProps({ isRevising: false })} />)
    const opacityEl = container.querySelector('.opacity-60')
    expect(opacityEl).not.toBeInTheDocument()
  })

  it('email variant uses leading-relaxed class', () => {
    const { container } = render(<DraftCard {...makeProps({ medium: 'email' })} />)
    const leadingEl = container.querySelector('.leading-relaxed')
    expect(leadingEl).toBeInTheDocument()
  })

  it('email variant renders multi-paragraph content as separate p elements', () => {
    const draft = 'Paragraph one.\n\nParagraph two.'
    render(<DraftCard {...makeProps({ medium: 'email', draftBody: draft })} />)
    expect(screen.getByText('Paragraph one.')).toBeInTheDocument()
    expect(screen.getByText('Paragraph two.')).toBeInTheDocument()
  })

  it('text variant uses leading-normal class', () => {
    const { container } = render(<DraftCard {...makeProps({ medium: 'text', draftBody: 'Short text.' })} />)
    const leadingEl = container.querySelector('.leading-normal')
    expect(leadingEl).toBeInTheDocument()
  })

  it('no hardcoded hex color values in class names', () => {
    const { container } = render(<DraftCard {...makeProps()} />)
    const allClassNames = Array.from(container.querySelectorAll('*'))
      .map((el) => el.className)
      .join(' ')
    expect(allClassNames).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
})

describe('DraftCardSkeleton', () => {
  it('renders with aria-busy="true"', () => {
    const { container } = render(<DraftCardSkeleton />)
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('renders with aria-label="Generating draft…"', () => {
    render(<DraftCardSkeleton />)
    expect(screen.getByLabelText('Generating draft…')).toBeInTheDocument()
  })

  it('does not render any real draft content', () => {
    render(<DraftCardSkeleton />)
    // Should not show any real text like "Email", "AI-generated draft"
    expect(screen.queryByText('AI-generated draft')).not.toBeInTheDocument()
  })
})
