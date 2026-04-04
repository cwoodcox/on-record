import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[color:var(--on-record-primary)] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Footer navigation">
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
            <li>
              <Link
                href="/setup"
                className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-record-accent)] focus-visible:ring-offset-2"
              >
                Set up On Record
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-record-accent)] focus-visible:ring-offset-2"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-record-accent)] focus-visible:ring-offset-2"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/cwoodcox/on-record"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-record-accent)] focus-visible:ring-offset-2"
              >
                GitHub
              </a>
            </li>
          </ul>
        </nav>
        <p className="mt-6 text-xs text-white/50">
          &copy; {new Date().getFullYear()} On Record. Open source. Not affiliated with the Utah State Legislature.
        </p>
      </div>
    </footer>
  )
}
