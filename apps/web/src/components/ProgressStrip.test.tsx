import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressStrip } from './ProgressStrip'

describe('ProgressStrip', () => {
  it('renders "Address" as first label (desktop visible)', () => {
    render(<ProgressStrip currentStep={1} />)
    // Desktop spans (hidden sm:block) render "Address"
    const desktopSpans = document.querySelectorAll('.hidden.sm\\:block')
    const labels = Array.from(desktopSpans).map((el) => el.textContent)
    expect(labels).toContain('Address')
  })

  it('renders "Your Rep" as second label', () => {
    render(<ProgressStrip currentStep={1} />)
    const desktopSpans = document.querySelectorAll('.hidden.sm\\:block')
    const labels = Array.from(desktopSpans).map((el) => el.textContent)
    expect(labels).toContain('Your Rep')
  })

  it('renders "Your Issue" as third label', () => {
    render(<ProgressStrip currentStep={1} />)
    const desktopSpans = document.querySelectorAll('.hidden.sm\\:block')
    const labels = Array.from(desktopSpans).map((el) => el.textContent)
    expect(labels).toContain('Your Issue')
  })

  it('renders "Send" as fourth label', () => {
    render(<ProgressStrip currentStep={1} />)
    const desktopSpans = document.querySelectorAll('.hidden.sm\\:block')
    const labels = Array.from(desktopSpans).map((el) => el.textContent)
    expect(labels).toContain('Send')
  })

  it('renders all 4 step labels on desktop', () => {
    render(<ProgressStrip currentStep={2} />)
    const desktopSpans = document.querySelectorAll('.hidden.sm\\:block')
    const labels = Array.from(desktopSpans).map((el) => el.textContent)
    expect(labels).toEqual(['Address', 'Your Rep', 'Your Issue', 'Send'])
  })

  it('root element is nav with aria-label="Form progress"', () => {
    render(<ProgressStrip currentStep={1} />)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    expect(nav).toBeInTheDocument()
  })

  it('active step has aria-current="step"', () => {
    render(<ProgressStrip currentStep={2} />)
    const activeStep = document.querySelector('[aria-current="step"]')
    expect(activeStep).toBeInTheDocument()
  })

  it('exactly one segment has aria-current="step"', () => {
    render(<ProgressStrip currentStep={2} />)
    const activeSteps = document.querySelectorAll('[aria-current="step"]')
    expect(activeSteps).toHaveLength(1)
  })

  it('no other segment has aria-current="step" when step 2 is active', () => {
    render(<ProgressStrip currentStep={2} />)
    // Only one element should have aria-current="step"
    const activeSteps = document.querySelectorAll('[aria-current="step"]')
    expect(activeSteps).toHaveLength(1)
    // Verify the active step shows "Your Rep" (step 2) on desktop
    const desktopSpan = activeSteps[0]?.querySelector('.hidden.sm\\:block')
    expect(desktopSpan?.textContent).toBe('Your Rep')
  })

  it('active step at step 3 shows "Your Issue" as active (aria-current)', () => {
    render(<ProgressStrip currentStep={3} />)
    const activeStep = document.querySelector('[aria-current="step"]')
    expect(activeStep).toBeInTheDocument()
    const desktopSpan = activeStep?.querySelector('.hidden.sm\\:block')
    expect(desktopSpan?.textContent).toBe('Your Issue')
  })

  it('step segments are not interactive buttons (no role=button)', () => {
    render(<ProgressStrip currentStep={1} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('mobile: active step shows full label via sm:hidden span', () => {
    render(<ProgressStrip currentStep={2} />)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    // The mobile spans (sm:hidden) for the active step should show the full label
    const mobileSpans = nav.querySelectorAll('.sm\\:hidden')
    // Second step (index 1) is active — its mobile span shows "Your Rep"
    const activeStepMobileTexts = Array.from(mobileSpans).filter(
      (el) => el.textContent === 'Your Rep'
    )
    expect(activeStepMobileTexts.length).toBeGreaterThan(0)
  })

  it('mobile: non-active steps show short labels', () => {
    render(<ProgressStrip currentStep={2} />)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    const mobileSpans = nav.querySelectorAll('.sm\\:hidden')
    const mobileTexts = Array.from(mobileSpans).map((el) => el.textContent)
    // Step 1 (not active) shows '1', step 2 (active) shows 'Your Rep', steps 3,4 show '3','4'
    expect(mobileTexts).toContain('1')
    expect(mobileTexts).toContain('3')
    expect(mobileTexts).toContain('4')
  })

  it('applies optional className to nav element', () => {
    render(<ProgressStrip currentStep={1} className="custom-class" />)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    expect(nav.className).toContain('custom-class')
  })

  it('completed steps have bg-on-record-accent class', () => {
    render(<ProgressStrip currentStep={3} />)
    // Steps 1 and 2 should be completed (steps before step 3)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    const listItems = nav.querySelectorAll('li')
    expect(listItems[0]?.className).toContain('bg-on-record-accent')
    expect(listItems[1]?.className).toContain('bg-on-record-accent')
  })

  it('active step has bg-white class', () => {
    render(<ProgressStrip currentStep={2} />)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    const listItems = nav.querySelectorAll('li')
    // Step 2 (index 1) is active
    expect(listItems[1]?.className).toContain('bg-white')
  })

  it('upcoming steps have opacity-40 class', () => {
    render(<ProgressStrip currentStep={1} />)
    const nav = screen.getByRole('navigation', { name: 'Form progress' })
    const listItems = nav.querySelectorAll('li')
    // Steps 2, 3, 4 (indices 1, 2, 3) are upcoming
    expect(listItems[2]?.className).toContain('opacity-40')
    expect(listItems[3]?.className).toContain('opacity-40')
  })

  it('no hardcoded hex color values in class names', () => {
    const { container } = render(<ProgressStrip currentStep={2} />)
    const allClassNames = Array.from(container.querySelectorAll('*'))
      .map((el) => el.className)
      .join(' ')
    expect(allClassNames).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })
})
