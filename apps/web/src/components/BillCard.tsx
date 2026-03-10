"use client"

import type { Bill } from '@on-record/types'
import { Skeleton } from '@/components/ui/skeleton'
import { CitationTag } from './CitationTag'

interface BillCardProps {
  bill: Bill
  theme?: string        // search theme (e.g. "healthcare") — shown as pill; omit to hide pill
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}

export function BillCard({
  bill,
  theme,
  selectable = false,
  selected = false,
  onSelect,
}: BillCardProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (selectable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSelect?.()
    }
  }

  return (
    <article
      aria-label={bill.title}
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
        selectable ? 'cursor-pointer motion-safe:transition-shadow motion-safe:hover:shadow-md min-h-[44px]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Theme pill — only when theme is provided */}
      {theme !== undefined && (
        <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-on-record-accent/15 text-on-record-accent px-2 py-0.5 rounded-sm mb-2">
          {theme}
        </span>
      )}

      {/* Bill ID — amber, monospace */}
      <p className="text-on-record-accent font-mono font-semibold text-base mb-1">
        {bill.id}
      </p>

      {/* Bill title */}
      <h3 className="text-on-record-text font-semibold mb-2">
        {bill.title}
      </h3>

      {/* Vote result + date (muted, supplementary context) — only when voteResult present */}
      {bill.voteResult !== undefined && (
        <p className="text-sm text-on-record-text/60 mb-3">
          {bill.voteResult}
          {bill.voteDate !== undefined && ` · ${bill.voteDate}`}
        </p>
      )}

      {/* Citation tag — canonical formatted citation */}
      <CitationTag
        billId={bill.id}
        session={bill.session}
        {...(bill.voteDate !== undefined ? { voteDate: bill.voteDate } : {})}
      />
    </article>
  )
}

export function BillCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading bill information"
      className="border-t-[3px] border-on-record-accent/30 bg-on-record-surface rounded-md shadow-sm p-4"
    >
      {/* Theme pill skeleton */}
      <Skeleton className="h-5 w-20 rounded-sm mb-2 [animation:none] motion-safe:animate-pulse" />
      {/* Bill ID skeleton */}
      <Skeleton className="h-5 w-24 mb-1 [animation:none] motion-safe:animate-pulse" />
      {/* Title skeleton */}
      <Skeleton className="h-6 w-3/4 mb-2 [animation:none] motion-safe:animate-pulse" />
      {/* Vote info skeleton */}
      <Skeleton className="h-4 w-40 mb-3 [animation:none] motion-safe:animate-pulse" />
      {/* CitationTag skeleton */}
      <Skeleton className="h-5 w-56 rounded-full [animation:none] motion-safe:animate-pulse" />
    </div>
  )
}
