export default function HomePage() {
  return (
    <>
      {/* Skip to main content — visually hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-on-record-accent focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent"
      >
        Skip to main content
      </a>

      {/* Header / Top Bar */}
      <header className="bg-on-record-primary px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <span className="text-xl font-bold tracking-tight text-white">
            On{" "}
            <span className="text-on-record-accent">Record</span>
          </span>
        </div>
      </header>

      <main id="main-content" className="bg-on-record-surface text-on-record-text dark:bg-on-record-surface dark:text-on-record-text">
        {/* Section 1: Hero */}
        <section className="px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-on-record-primary dark:text-on-record-text sm:text-5xl">
              Write your Utah legislator in minutes — in your own voice.
            </h1>
            <p className="mb-10 max-w-2xl text-lg leading-relaxed text-on-record-text dark:text-on-record-text">
              On Record lives inside ChatGPT. Tell it what matters to you, and
              it finds your representative and helps you write a real, personal
              message — grounded in what your legislator has actually done.
            </p>
            <a
              href="#"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-on-record-accent px-8 py-3 text-lg font-bold text-white transition-colors hover:bg-[#a8681f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-record-accent focus-visible:ring-offset-2"
            >
              Open in ChatGPT →
            </a>
          </div>
        </section>

        {/* Section 2: How it works */}
        <section className="border-t border-on-record-primary/10 bg-white px-6 py-16 dark:bg-on-record-primary dark:border-white/10">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-2xl font-bold text-on-record-primary dark:text-on-record-text">
              How it works
            </h2>
            <ol className="space-y-8">
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-record-primary text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  1
                </span>
                <div>
                  <p className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                    Open On Record in ChatGPT
                  </p>
                  <p className="mt-1 text-base text-on-record-text dark:text-on-record-text/80">
                    One click. No setup. Free to add to your ChatGPT account.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-record-primary text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  2
                </span>
                <div>
                  <p className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                    Tell it what you care about and your home address
                  </p>
                  <p className="mt-1 text-base text-on-record-text dark:text-on-record-text/80">
                    It looks up your district and finds the right people to
                    contact automatically.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-record-primary text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  3
                </span>
                <div>
                  <p className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                    Get a personal, cited message to send — in your words, not a
                    template
                  </p>
                  <p className="mt-1 text-base text-on-record-text dark:text-on-record-text/80">
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
            <h2 className="mb-8 text-2xl font-bold text-on-record-primary dark:text-on-record-text">
              Who it&apos;s for
            </h2>
            <blockquote className="rounded-xl border-l-4 border-on-record-accent bg-white px-8 py-6 shadow-sm dark:bg-on-record-primary">
              <p className="text-lg leading-relaxed text-on-record-text dark:text-on-record-text">
                &ldquo;I went to a town hall last month and left wanting to do
                more. I&rsquo;ve never written to my representative before — I
                didn&rsquo;t know how to start or what to say. On Record helped
                me write something real in about ten minutes.&rdquo;
              </p>
              <footer className="mt-4 text-sm font-semibold text-on-record-primary dark:text-on-record-accent">
                — Deb, Salt Lake City resident
              </footer>
            </blockquote>
            <ul className="mt-8 space-y-3 text-base text-on-record-text dark:text-on-record-text">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-on-record-accent" aria-hidden="true">
                  ✓
                </span>
                You care about something happening in Utah — schools, water,
                housing, healthcare — and want your voice heard.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-on-record-accent" aria-hidden="true">
                  ✓
                </span>
                You have a ChatGPT account (free or paid).
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-on-record-accent" aria-hidden="true">
                  ✓
                </span>
                You want to send a personal note, not sign a pre-written
                petition.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: FAQ */}
        <section className="border-t border-on-record-primary/10 bg-white px-6 py-16 dark:bg-on-record-primary dark:border-white/10">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold text-on-record-primary dark:text-on-record-text">
              Questions
            </h2>
            <dl className="space-y-8">
              <div>
                <dt className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                  Do I need to create an account?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-on-record-text dark:text-on-record-text/80">
                  No. On Record connects to the AI tool you already use. There
                  is no separate login, no password to remember, and no personal
                  data stored by On Record.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                  Does this cost anything?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-on-record-text dark:text-on-record-text/80">
                  On Record is free to add to your ChatGPT account.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                  Does it write the message for me?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-on-record-text dark:text-on-record-text/80">
                  It helps you write it. You tell the AI what you care about in
                  your own words, and it drafts a message that reflects your
                  concern — citing real bills your legislator has worked on. You
                  review it, change anything you want, and send it yourself.
                </dd>
              </div>
              <div>
                <dt className="text-lg font-semibold text-on-record-primary dark:text-on-record-text">
                  Does it work outside of Utah?
                </dt>
                <dd className="mt-2 text-base leading-relaxed text-on-record-text dark:text-on-record-text/80">
                  Right now, On Record covers Utah state legislators only. We
                  plan to expand to other states in the future.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

    </>
  );
}
