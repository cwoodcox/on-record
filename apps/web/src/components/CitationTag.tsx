"use client"

export interface CitationTagProps {
  billId: string
  session: string
  voteDate?: string // ISO 8601: "2026-02-15" — optional (undefined when bill has no vote)
}

function formatSession(session: string): string {
  const year = session.slice(0, 4)
  const type = session.slice(4)
  const typeLabel =
    type === 'GS' ? 'General Session' :
    type === 'SS' ? 'Special Session' :
    type // fallback: render raw suffix
  return `${year} ${typeLabel}`
}

export function formatVoteDate(isoDate: string): string {
  // Parse as UTC to prevent timezone shift (e.g. "2026-02-15" parsed locally
  // in UTC-7 becomes Feb 14 — this is the bug pattern caught in Story 3.4).
  const [year, month, day] = isoDate.split('-').map(Number)
  const d = new Date(Date.UTC(year!, month! - 1, day!))
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function CitationTag({ billId, session, voteDate }: CitationTagProps) {
  const sessionLabel = formatSession(session)
  const parts = [billId, sessionLabel]
  if (voteDate !== undefined) {
    parts.push(formatVoteDate(voteDate))
  }

  return (
    <span className="inline-block text-sm font-mono text-on-record-text/70 bg-on-record-surface border border-on-record-accent/30 rounded-full px-2.5 py-0.5">
      {parts.join(' · ')}
    </span>
  )
}
