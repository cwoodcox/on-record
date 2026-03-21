"use client"

import { CitationTag } from './CitationTag'
import type { CitationTagProps } from './CitationTag'
import { Skeleton } from '@/components/ui/skeleton'

interface DraftCardProps {
  medium: 'email' | 'text'
  formality: 'conversational' | 'formal'
  draftBody: string
  citation: CitationTagProps
  isRevising?: boolean
}

export function DraftCard({
  medium,
  formality,
  draftBody,
  citation,
  isRevising = false,
}: DraftCardProps) {
  const mediumLabel = medium === 'email' ? 'Email' : 'Text / SMS'
  const formalityLabel = formality === 'conversational' ? 'Conversational' : 'Formal'

  return (
    <div className="bg-on-record-surface border-t-[3px] border-on-record-accent rounded-md shadow-sm p-4">
      {/* Header row: medium badge + formality badge + AI disclosure */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-on-record-accent/15 text-on-record-accent px-2 py-0.5 rounded-sm">
          {mediumLabel}
        </span>
        <span className="inline-block text-xs font-semibold uppercase tracking-wide bg-on-record-accent/15 text-on-record-accent px-2 py-0.5 rounded-sm">
          {formalityLabel}
        </span>
        <span className="text-xs text-on-record-text/50 italic">AI-generated draft</span>
      </div>

      {/* Card body with optional revising state */}
      <div className={isRevising ? 'opacity-60' : ''}>
        {/* Draft body — selectable div, NOT a button */}
        {medium === 'email' ? (
          <div className="text-on-record-text leading-relaxed space-y-4">
            {draftBody.split('\n\n').map((paragraph, i) => (
              <p key={paragraph.slice(0, 40) + i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <div className="text-on-record-text leading-normal">
            {draftBody}
          </div>
        )}

        {/* Character count — text/SMS only, shown when >= 130 chars */}
        {medium === 'text' && draftBody.length >= 130 && (
          <p className="text-xs text-on-record-text/60 text-right mt-1">
            {draftBody.length}/160
          </p>
        )}

        {/* CitationTag — below draft body */}
        <div className="mt-3">
          <CitationTag {...citation} />
        </div>
      </div>
    </div>
  )
}

export function DraftCardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Generating draft…"
      className="bg-on-record-surface border-t-[3px] border-on-record-accent rounded-md shadow-sm p-4"
    >
      {/* Header row skeleton */}
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded-sm [animation:none] motion-safe:animate-pulse" />
        <Skeleton className="h-5 w-24 rounded-sm [animation:none] motion-safe:animate-pulse" />
        <Skeleton className="h-5 w-32 rounded-sm [animation:none] motion-safe:animate-pulse" />
      </div>
      {/* Draft body skeleton — multi-line to approximate email length */}
      <Skeleton className="h-4 w-full mb-2 [animation:none] motion-safe:animate-pulse" />
      <Skeleton className="h-4 w-5/6 mb-2 [animation:none] motion-safe:animate-pulse" />
      <Skeleton className="h-4 w-4/5 mb-2 [animation:none] motion-safe:animate-pulse" />
      <Skeleton className="h-4 w-full mb-4 [animation:none] motion-safe:animate-pulse" />
      {/* CitationTag skeleton */}
      <Skeleton className="h-5 w-56 rounded-full [animation:none] motion-safe:animate-pulse" />
    </div>
  )
}
