import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — On Record',
}

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      className="bg-[color:var(--on-record-surface)] px-6 py-16 text-[color:var(--on-record-text)]"
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold leading-tight text-[color:var(--on-record-primary)]">
          Privacy Policy
        </h1>
        <p className="mb-6 text-sm text-[color:var(--on-record-text)]/60">
          Last updated: March 31, 2026
        </p>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            What data we collect
          </h2>
          <p className="mb-4 leading-relaxed">
            On Record asks for your home address so it can identify your Utah
            state representatives and senators. That is the only information it
            collects.
          </p>
          <p className="leading-relaxed">
            We do not collect your name, email address, phone number, or any
            other personal details.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            How we use your address
          </h2>
          <p className="mb-4 leading-relaxed">
            Your address is used for one purpose only: to look up the
            legislative district it falls in, so On Record can find your
            representatives. It is passed to the Utah Geospatial Resource Center
            (UGRC) geocoding service to determine your district.
          </p>
          <p className="leading-relaxed">
            Your address is never used for marketing, analytics, advertising, or
            any purpose other than this single legislator lookup.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            How long we keep your address
          </h2>
          <p className="leading-relaxed">
            On Record does not store your address. It is used during your
            session and is not written to any database or log file by On Record.
            Once your session ends, it is gone. There is no persistent storage
            of your address on our servers.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Do we share your address with third parties?
          </h2>
          <p className="mb-4 leading-relaxed">
            No. On Record does not sell, rent, or share your address with any
            third party for commercial purposes.
          </p>
          <p className="leading-relaxed">
            The only external service that receives your address is the UGRC
            geocoding API, operated by the State of Utah, which is required to
            determine your legislative district. No other third party receives
            your address.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Cookies and tracking
          </h2>
          <p className="leading-relaxed">
            On Record does not use cookies for tracking. We do not use
            third-party analytics services that track individual users across
            websites.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Children&apos;s privacy
          </h2>
          <p className="leading-relaxed">
            On Record is not directed at children under 13 and does not
            knowingly collect information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Contact
          </h2>
          <p className="leading-relaxed">
            If you have questions about this privacy policy or how On Record
            handles data, please open an issue on{' '}
            <a
              href="https://github.com/cwoodcox/on-record"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--on-record-accent)] underline underline-offset-4 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-record-accent)] focus-visible:ring-offset-2"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
