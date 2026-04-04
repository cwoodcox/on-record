export default function HomePage() {
  return (
    <>
      {/* Skip to main content — visually hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[#c47d2e] focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c47d2e]"
      >
        Skip to main content
      </a>

      {/* Header / Top Bar */}
      <header className="bg-[#1e3a4f] px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <span className="text-xl font-bold tracking-tight text-white">
            On{" "}
            <span className="text-[#c47d2e]">Record</span>
          </span>
        </div>
      </header>

      <main id="main-content" className="bg-[#fafaf8] text-[#1a1a1a] dark:bg-[#0f1f2b] dark:text-[#e8e4dc]">
        {/* Section 1: Hero */}
        <section className="px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-[#1e3a4f] dark:text-[#e8e4dc] sm:text-5xl">
              Write your Utah legislator in minutes — in your own voice.
            </h1>
            <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[#1a1a1a] dark:text-[#e8e4dc]">
              On Record works inside Claude.ai or ChatGPT — an AI subscription
              you already have. No new account. No extra cost. Just tell it what
              matters to you, and it finds your representative and helps you
              write a real, personal message.
            </p>
            <a
              href="/setup"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[#c47d2e] px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-[#a8681f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47d2e] focus-visible:ring-offset-2"
            >
              Get started →
            </a>
          </div>
        </section>

        {/* Section 2: How it works */}
        <section className="border-t border-[#1e3a4f]/10 bg-white px-6 py-16 dark:bg-[#0a1520] dark:border-white/10">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-2xl font-bold text-[#1e3a4f] dark:text-[#e8e4dc]">
              How it works
            </h2>
            <ol className="space-y-8">
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a4f] text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  1
                </span>
                <div>
                  <p className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                    Connect On Record to your AI assistant
                  </p>
                  <p className="mt-1 text-base text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                    Takes about 2 minutes. Works with Claude.ai and ChatGPT.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a4f] text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  2
                </span>
                <div>
                  <p className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                    Tell it what you care about and your home address
                  </p>
                  <p className="mt-1 text-base text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                    It looks up your district and finds the right people to
                    contact automatically.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a4f] text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  3
                </span>
                <div>
                  <p className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                    Get a personal, cited message to send — in your words, not a
                    template
                  </p>
                  <p className="mt-1 text-base text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                    Your message refers to bills your legislator has actually
                    worked on. It sounds like you, not a form letter.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* Section 3: Who it's for */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold text-[#1e3a4f] dark:text-[#e8e4dc]">
              Who it&apos;s for
            </h2>
            <blockquote className="rounded-xl border-l-4 border-[#c47d2e] bg-white px-8 py-6 shadow-sm dark:bg-[#0a1520]">
              <p className="text-lg leading-relaxed text-[#1a1a1a] dark:text-[#e8e4dc]">
                &ldquo;I went to a town hall last month and left wanting to do
                more. I&rsquo;ve never written to my representative before — I
                didn&rsquo;t know how to start or what to say. On Record helped
                me write something real in about ten minutes.&rdquo;
              </p>
              <footer className="mt-4 text-sm font-semibold text-[#1e3a4f] dark:text-[#c47d2e]">
                — Deb, Salt Lake City resident
              </footer>
            </blockquote>
            <ul className="mt-8 space-y-3 text-base text-[#1a1a1a] dark:text-[#e8e4dc]">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[#c47d2e]" aria-hidden="true">
                  ✓
                </span>
                You care about something happening in Utah — schools, water,
                housing, healthcare — and want your voice heard.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[#c47d2e]" aria-hidden="true">
                  ✓
                </span>
                You already use Claude.ai or ChatGPT.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[#c47d2e]" aria-hidden="true">
                  ✓
                </span>
                You want to send a personal note, not sign a pre-written
                petition.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: FAQ */}
        <section className="border-t border-[#1e3a4f]/10 bg-white px-6 py-16 dark:bg-[#0a1520] dark:border-white/10">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold text-[#1e3a4f] dark:text-[#e8e4dc]">
              Questions
            </h2>
            <dl className="space-y-8">
              <div>
                <dt className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                  Do I need to create an account?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                  No. On Record connects to the AI tool you already use. There
                  is no separate login, no password to remember, and no personal
                  data stored by On Record.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                  Does this cost anything?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                  On Record itself is free. You need a subscription to Claude.ai
                  or ChatGPT (which many people already have). There is no
                  additional charge for using On Record with those tools.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                  Does it write the message for me?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                  It helps you write it. You tell the AI what you care about in
                  your own words, and it drafts a message that reflects your
                  concern — citing real bills your legislator has worked on. You
                  review it, change anything you want, and send it yourself.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-semibold text-[#1e3a4f] dark:text-[#e8e4dc]">
                  Does it work outside of Utah?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-[#1a1a1a] dark:text-[#e8e4dc]/80">
                  Right now, On Record covers Utah state legislators only. We
                  plan to expand to other states in the future.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#1e3a4f] px-6 py-10 text-white dark:bg-[#0a1520]">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-6 text-sm">
              <li>
                <a
                  href="/setup"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47d2e]"
                >
                  Set up On Record
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47d2e]"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/cwoodcox/on-record"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c47d2e]"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
          <p className="mt-6 text-xs text-white/50">
            © {new Date().getFullYear()} On Record. Open source. Not affiliated
            with the Utah State Legislature.
          </p>
        </div>
      </footer>
    </>
  );
}
