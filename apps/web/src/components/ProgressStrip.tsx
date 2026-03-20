"use client"

const STEPS = [
  { label: 'Address', shortLabel: '1' },
  { label: 'Your Rep', shortLabel: '2' },
  { label: 'Your Issue', shortLabel: '3' },
  { label: 'Send', shortLabel: '4' },
] as const

interface ProgressStripProps {
  currentStep: 1 | 2 | 3 | 4
}

export function ProgressStrip({ currentStep }: ProgressStripProps) {
  return (
    <nav aria-label="Form progress">
      <ol className="flex w-full">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isActive = stepNumber === currentStep
          const isUpcoming = stepNumber > currentStep

          const segmentClasses = [
            'flex-1 flex items-center justify-center px-2 py-1.5 text-sm font-medium',
            isCompleted
              ? 'bg-on-record-accent text-white'
              : isActive
                ? 'bg-white border border-on-record-accent text-on-record-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2'
                : 'bg-on-record-accent opacity-40 text-white',
          ]
            .filter(Boolean)
            .join(' ')

          // Upcoming segments need opacity via wrapper; active has explicit class
          // Use a div wrapper for upcoming to avoid opacity cascading issues
          if (isUpcoming) {
            return (
              <li
                key={step.label}
                className="flex-1 flex items-center justify-center px-2 py-1.5 text-sm font-medium bg-on-record-accent opacity-40 text-white"
              >
                {/* Mobile: show short label only; desktop: show full label */}
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:block">{step.label}</span>
              </li>
            )
          }

          return (
            <li
              key={step.label}
              className={segmentClasses}
              {...(isActive ? { 'aria-current': 'step' } : {})}
            >
              {/* Mobile: active step shows full label; non-active shows short label */}
              <span className="sm:hidden">
                {isActive ? step.label : step.shortLabel}
              </span>
              {/* Desktop: always show full label */}
              <span className="hidden sm:block">{step.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
