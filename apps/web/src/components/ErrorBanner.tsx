// apps/web/src/components/ErrorBanner.tsx
// Accessible amber-tinted error banner for address lookup failures.
// Uses shadcn/ui Alert and Badge primitives.
// No barrel file — import this component directly.

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface ErrorBannerProps {
  source: string        // e.g. 'gis-api' → displayed as badge text
  message: string       // nature field from AppError
  action: string        // action field from AppError (display text)
  onAction?: () => void // callback for recoverable variant
  actionHref?: string   // link href for non-recoverable external fallback
}

export function ErrorBanner({ source, message, action, onAction, actionHref }: ErrorBannerProps) {
  return (
    <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500 text-amber-700 dark:text-amber-400"
        >
          {source}
        </Badge>
        <div className="flex-1">
          <AlertDescription className="text-sm">{message}</AlertDescription>
          <div className="mt-2">
            {onAction ? (
              <button
                onClick={onAction}
                className="min-h-[44px] px-2 text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
              >
                {action}
              </button>
            ) : actionHref ? (
              <a
                href={actionHref}
                className="text-sm font-medium text-amber-700 underline hover:no-underline dark:text-amber-400"
              >
                {action}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{action}</p>
            )}
          </div>
        </div>
      </div>
    </Alert>
  )
}
