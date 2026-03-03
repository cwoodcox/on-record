"use client"

import type { Legislator } from '@on-record/types'
import { Skeleton } from '@/components/ui/skeleton'

interface LegislatorCardProps {
  legislator: Legislator
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}

export function LegislatorCard({
  legislator,
  selectable = false,
  selected = false,
  onSelect,
}: LegislatorCardProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (selectable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSelect?.()
    }
  }

  const chamberLabel = legislator.chamber === 'house' ? 'House' : 'Senate'

  return (
    <article
      aria-label={`${legislator.name}, ${chamberLabel} District ${legislator.district}`}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
      className={[
        'border-t-[3px] border-on-record-accent',
        'bg-on-record-surface rounded-md shadow-sm p-4',
        'focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2',
        selectable
          ? 'cursor-pointer motion-safe:transition-shadow motion-safe:hover:shadow-md'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Chamber badge */}
      <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-on-record-primary text-white px-2 py-0.5 rounded-sm mb-2">
        {chamberLabel}
      </span>

      {/* Legislator name — must be h2 per UX spec a11y requirement */}
      <h2 className="text-lg font-semibold text-on-record-text mb-1">
        {legislator.name}
      </h2>

      {/* District */}
      <p className="text-sm text-on-record-text/70 mb-3">
        District {legislator.district}
      </p>

      {/* Contact info */}
      <div className="space-y-1 text-sm">
        <div>
          <a
            href={`mailto:${legislator.email}`}
            className="text-on-record-primary underline hover:text-on-record-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-1 rounded-sm"
          >
            {legislator.email}
          </a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-on-record-text">{legislator.phone}</span>
          {legislator.phoneLabel && !legislator.phoneTypeUnknown && (
            <span className="text-xs text-on-record-text/60">
              ({legislator.phoneLabel})
            </span>
          )}
          {legislator.phoneTypeUnknown === true && (
            <span className="text-xs text-on-record-text/60 italic">
              number type unknown
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export function LegislatorCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading legislator information"
      className="border-t-[3px] border-on-record-accent/30 bg-on-record-surface rounded-md shadow-sm p-4"
    >
      {/* Badge skeleton */}
      <Skeleton className="h-5 w-16 rounded-sm mb-2 [animation:none] motion-safe:animate-pulse" />
      {/* Name skeleton */}
      <Skeleton className="h-6 w-48 mb-1 [animation:none] motion-safe:animate-pulse" />
      {/* District skeleton */}
      <Skeleton className="h-4 w-24 mb-3 [animation:none] motion-safe:animate-pulse" />
      {/* Email skeleton */}
      <Skeleton className="h-4 w-56 mb-1 [animation:none] motion-safe:animate-pulse" />
      {/* Phone skeleton */}
      <Skeleton className="h-4 w-40 [animation:none] motion-safe:animate-pulse" />
    </div>
  )
}
