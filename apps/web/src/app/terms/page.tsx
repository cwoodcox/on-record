import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — On Record',
}

export default function TermsPage() {
  return (
    <main
      id="main-content"
      className="bg-[color:var(--on-record-surface)] px-6 py-16 text-[color:var(--on-record-text)]"
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-bold leading-tight text-[color:var(--on-record-primary)]">
          Terms of Service
        </h1>
        <p className="mb-6 text-sm text-[color:var(--on-record-text)]/60">
          Last updated: March 31, 2026
        </p>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            What On Record is
          </h2>
          <p className="mb-4 leading-relaxed">
            On Record is a free, open-source civic tool that helps Utah
            residents identify their state legislators and draft personal,
            cited messages to send to them. It works through AI assistants you
            already use — Claude.ai or ChatGPT — by connecting to the On Record
            MCP server.
          </p>
          <p className="leading-relaxed">
            On Record is not affiliated with the Utah State Legislature, any
            political party, or any government agency.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Appropriate use
          </h2>
          <p className="mb-4 leading-relaxed">
            On Record is designed for lawful civic communication. You agree to
            use it only for that purpose.
          </p>
          <p className="mb-4 leading-relaxed">You agree not to use On Record to:</p>
          <ul className="mb-4 list-disc space-y-2 pl-6 leading-relaxed">
            <li>Send spam, bulk messages, or automated communications</li>
            <li>
              Harass, threaten, or intimidate legislators or other individuals
            </li>
            <li>
              Misrepresent your identity or pretend to be someone else
            </li>
            <li>
              Violate any applicable local, state, or federal law
            </li>
            <li>Attempt to disrupt or overload the service</li>
          </ul>
          <p className="leading-relaxed">
            On Record helps you draft a message; you are responsible for
            reviewing it and deciding what to send.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            No warranty
          </h2>
          <p className="mb-4 leading-relaxed">
            On Record is provided &ldquo;as is,&rdquo; without any warranty of
            any kind. We make no guarantees about:
          </p>
          <ul className="list-disc space-y-2 pl-6 leading-relaxed">
            <li>
              The accuracy or completeness of legislator contact information or
              bill data
            </li>
            <li>
              The availability or uptime of the service at any particular time
            </li>
            <li>
              Whether a message drafted with On Record will achieve any
              particular outcome
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Limitation of liability
          </h2>
          <p className="leading-relaxed">
            To the fullest extent permitted by law, the maintainers of On
            Record are not liable for any direct, indirect, incidental, or
            consequential damages arising from your use of this service,
            including but not limited to outcomes of messages sent to
            legislators, reliance on information provided by the tool, or
            service interruptions.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Governing law
          </h2>
          <p className="leading-relaxed">
            These terms are governed by and construed in accordance with the
            laws of the State of Utah, without regard to its conflict of law
            provisions. Any disputes arising from these terms or your use of
            On Record will be subject to the jurisdiction of the courts of Utah.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Changes to these terms
          </h2>
          <p className="leading-relaxed">
            We may update these terms from time to time. When we do, we will
            update the date at the top of this page. Continued use of On Record
            after changes are posted means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-[color:var(--on-record-primary)]">
            Contact
          </h2>
          <p className="leading-relaxed">
            Questions about these terms? Open an issue on{' '}
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
