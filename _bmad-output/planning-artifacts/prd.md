---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments: []
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: web_app
  domain: govtech
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document — Write Your Legislator

**Author:** Corey
**Date:** 2026-02-18
**Type:** Web application (AI-powered chatbot, MCP tooling backend) | **Domain:** Govtech / Civic Tech | **Complexity:** High | **Context:** Greenfield

## Executive Summary

Write Your Legislator is a civic engagement web application that helps progressive Utahns make direct, credible contact with their state legislators. The target user is motivated enough to attend a weekly PAC meeting but lacks the domain confidence to write a letter that doesn't feel generic. By automating the research layer — identifying legislators via GIS lookup, surfacing recent bills and votes from that specific legislator, and grounding the draft in that legislator's actual record — the app enables constituents to contact their representatives with specificity that signals genuine engagement. Initial scope is Utah's state legislature; architecture is designed for expansion to all 50 states and the federal government. The service is free, funded by voluntary donation.

### What Makes This Special

Form letters get ignored. Legislators in heavily gerrymandered states like Utah rationalize away progressive constituent voices by treating organized contact as astroturfing. Write Your Legislator produces messages that are personal in voice and specific in substance — referencing real bills, real votes, real positions — in a format appropriate to the chosen medium (email or text). A message referencing a specific bill number from a constituent in the legislator's own district cannot be dismissed as a template. The core differentiator is constituent visibility: making it undeniable that informed, engaged voters exist in every Utah district and are paying attention to what their representatives actually do.

## Success Criteria

### User Success

- User completes the chatbot flow and receives a draft in their own voice, grounded in their legislator's actual record
- Draft is appropriately concise for the chosen medium (brief for text; multi-paragraph for email) and appropriately formal without sounding bureaucratic
- User opens the message in their email client or copies it to send via one action
- Primary failure mode avoided: user does not read the output and think "this sounds like AI — I'd never say this"

### Business Success

- Return usage without account creation — a user who comes back a second time is a meaningful victory
- Geographic distribution: messages composed from constituents across all 29 Utah senate districts
- Legislator acknowledgment: any Utah legislator's office noticing or responding to an increase in specific constituent contact — positive or negative
- Organizational adoption: Elevate Utah (or similar PACs) publicly promotes the tool
- Press coverage: any earned media mention in Utah-focused political press

### Technical Success

- MCP tools reliably resolve a Utah address to the correct state legislators via GIS API
- Bill and vote lookup surfaces relevant, recent legislative activity for the identified legislator
- LLM output consistently passes the voice-authenticity bar — specific, concise, non-generic — across at least two major chatbot platforms (Claude.ai, ChatGPT)

### Measurable Outcomes

- **3-month:** Functional end-to-end flow; at least one PAC shout-out; internal testing coverage across 5+ senate districts
- **12-month:** Documented use across 15+ of 29 senate districts; at least one external acknowledgment (legislator, press, or advocacy org); repeat usage observed in analytics
- **Quality bar:** Zero instances of a user publicly citing the tool as producing generic or AI-sounding output

## Product Scope

### MVP Strategy

The MVP exists to validate two questions: (1) Is the BYOLLM setup accessible enough for motivated but non-technical civic participants? (2) Does the output clear the voice-authenticity bar for real users? Launch target is a soft release at or after an Elevate Utah meeting — real users, not internal testing only. Resource model is solo developer, open-source from the start; volunteer contributions welcome as community connections develop. OpenStates is identified as a potential strategic partner for data and ecosystem.

### Phase 1 — MVP

- SEO-optimized, mobile-responsive landing page explaining the tool and BYOLLM setup in terms a non-technical PAC attendee can follow
- MCP tool: address → Utah House and Senate legislator lookup via UGRC GIS API
- MCP tool: bill/vote search for a specific legislator, with local cache, per-legislator sponsor index, and session awareness
- System prompt / agent instructions for 4-step guided flow (interests → legislator → bill context → draft)
- Voice-calibrated message draft formatted for chosen medium, with source citation (bill number, session, vote date)
- Email delivery: mailto: URI; text delivery: clipboard copy
- Rep contact info surfaced with number-type label and ambiguity warning where type is unknown
- TLS via Let's Encrypt on MCP backend public endpoint
- Structured logging for error tracing (no custom admin UI)
- Public GitHub repo with MCP tool documentation and local dev setup instructions

**Explicitly out of MVP:** hosted LLM, user accounts, session persistence, donation mechanism, analytics dashboard, federal legislators, mobile-native app.

### Phase 2 — Growth

- On-device LLM paths: browser-based (WebLLM, Transformers.js), local desktop (Ollama), Apple Intelligence / Core ML (iOS/macOS), Gemini Nano via Android AICore — evaluated before committing to hosted LLM budget
- Hosted LLM option if BYOLLM and on-device paths prove insufficient (requires external budget)
- Donation mechanism
- Session continuity without login (cookie/localStorage)
- "Did you send it?" optional browser notification
- Analytics: district coverage heat map, usage trends
- Federal delegation: Utah's US Senators and House members
- OpenStates integration as data source / ecosystem contribution

### Phase 3 — Expansion

- All 50 US state legislatures and US Congress
- Native mobile app (iOS and Android)
- PAC/advocacy org integrations and white-label options
- Multi-language support (Spanish first)
- Full WCAG 2.1 AA accessibility audit

### Risk Mitigation

**BYOLLM friction (highest priority):** Setup may be too high-barrier for non-technical users. Mitigation: invest heavily in onboarding clarity on the landing page; test with 3–5 Elevate Utah attendees before public launch. Fallback path: on-device LLM first, then hosted LLM if needed.

**Voice authenticity:** Output may read as AI-generated. Mitigation: qualitative review by real target users before launch; system prompt instructs the LLM to reflect the user's own words and stories back, not to editorialize.

**Legislature API instability:** API is "experimental" and can be removed without notice. Mitigation: data-provider abstraction in MCP tool architecture; OpenStates and LegiScan identified as fallback sources.

**Strategic opportunity — OpenStates:** MCP tooling built for Utah may be contributable to the OpenStates ecosystem, providing multi-state data coverage and community without solo maintenance burden.

## User Journeys

### Journey 1: Deb — The Constituent Who Showed Up (Success Path)

Deb is 54, a middle school art teacher in Murray. She's attended three Elevate Utah meetings this month and is furious about the legislature's latest attempt to gut Proposition 4. She knows the name of her state rep — she's looked it up twice — but every time she sits down to write an email, she stares at a blank screen and closes the tab. *What do I even say? I don't know enough. I'll sound like an idiot.*

A friend from Elevate Utah posts a link to Write Your Legislator on the group's Signal chat.

Deb clicks through to the landing page, reads the two-paragraph explainer, and clicks "Open in Claude.ai" (she has a free account). The chatbot asks: *What brings you here today — is there something specific going on, or just a general feeling that something needs to be said?*

She types: "Prop 4. The legislature keeps ignoring it and now they want to repeal it entirely."

The bot asks for her address. The MCP tool resolves it to her House and Senate districts in seconds. It surfaces her senator's recent activity — a floor statement opposing the independent redistricting commission and a vote against a transparency amendment.

"That's exactly it," she types. "He acts like no one in his district cares about this."

The bot asks: email or text? How formal? Reference a specific bill or keep it broader?

She chooses email, medium formality. The draft comes back: two paragraphs, her name, her street, the senator's vote referenced by bill number. Her voice — she can tell because it says "I've lived in this district for 22 years" and that's exactly what she would say.

She clicks the mailto: link, her Gmail opens, she changes one word and hits send.

*I actually did it.*

**Requirements revealed:** Address-to-legislator lookup, bill/vote search, conversational flow (medium + formality preference), mailto: link generation, voice-calibration prompting.

---

### Journey 2: Marcus — "I Don't Know What Bill, I Just Know My Sister Can't Afford Insulin" (Edge Case Path)

Marcus is 31, a software developer in Provo. Not politically active in any organized way, but quietly seething — his sister is uninsured and rationing insulin. He saw a post about Write Your Legislator on Bluesky.

He opens the tool and types: "I want to write my rep but I don't even know where to start. I just know things are messed up."

The bot responds: *That's a totally valid place to start. Can you tell me a bit about what's been hitting close to home — for you or people you care about?*

Marcus types about his sister. The bot asks for his address, resolves his House rep, then searches that rep's health-related legislative activity — surfacing a vote against a Medicaid gap-coverage amendment and a co-sponsorship of a pharmacy benefit manager transparency bill.

"Huh. So they did *something*," Marcus says.

The bot asks: *Lead with gratitude for the pharmacy bill and push harder on the coverage gap — or just focus on the gap?*

Marcus chooses to focus on the gap. The draft: short, specific, personal. His sister (not by name), the rep's vote against the amendment by number, a direct question about what the rep plans to do for constituents in the coverage gap.

*This is actually what I wanted to say.*

He copies it into a text to the rep's office number listed by the bot.

**Requirements revealed:** Open-ended issue elicitation, personal-situation prompting, thematic bill search, medium selection, rep contact info (phone/text).

---

### Journey 3: Corey — Keeping the Lights On (Operator)

Elevate Utah posted the link in their newsletter. Corey opens his terminal the next morning to 3x normal traffic. Two errors in the log: the Legislature API returned a 503 twice (transient, retry logic handled it) and a GIS lookup failed on a rural P.O. Box (non-residential address edge case — filed as a bug). One bill search returned an irrelevant result for a rep with a common surname — query needs a district ID filter.

Twenty minutes, two notes, back to his day job.

**Requirements revealed:** Structured logging with request/response tracing, error categorization (API vs. logic failures), MCP query logging, operator access via hosting platform log stream (no custom admin UI).

---

### Journey 4: The Developer Who Wants to Extend the Tools (MCP Power User)

A civic tech developer in Denver reads a Mastodon thread about Write Your Legislator. Building something similar for Colorado, they find the GitHub repo, read the MCP tool docs, and spin up the tools locally. Within an hour they've confirmed the Utah GIS lookup works end-to-end and are studying the bill search query structure for Colorado adaptation. They open an issue asking about a multi-state abstraction layer.

**Requirements revealed:** Public GitHub repo, MCP tool documentation, local dev setup instructions, issue tracker / community touchpoint.

## Domain-Specific Requirements

### Compliance & Regulatory

- **Privacy policy at launch:** App collects home addresses for legislator lookup. No persistent storage is planned; a privacy policy must state this explicitly and be linked from the landing page. Policy must be updatable as practices evolve.
- **Utah AI regulation compliance:** Utah AI Policy Act applies. Track applicable requirements. An unobtrusive AI disclosure on generated messages is low-cost insurance; implementation deferred to post-MVP but designed for in message output.
- **No federal AI regulation dependency:** Current federal posture requires no AI disclosure; design must not assume this remains true.

### Technical Constraints

- **Legislature API caching (mandatory):** `glen.le.utah.gov` is "experimental basis only" — can be altered or removed without notice. Developer token required. Cache refresh limits must be respected or the app risks being blocked: bills/reading calendar ≤ hourly; legislators ≤ daily; committees ≤ 3×/day. Local caching is required, not optional.
- **Legislature API stability risk:** Architecture treats the official API as a replaceable data source. Bill search logic is abstracted behind a provider interface (OpenStates, LegiScan as identified fallbacks).
- **Legislator-to-bill indexing:** The API exposes no direct "bills by legislator" query — bill lists are session-scoped and must be filtered by sponsor client-side. The cache must build and maintain a per-legislator sponsor index. This is an architectural dependency of the bill search MCP tool.
- **GIS API:** UGRC API (`api.mapserv.utah.gov`) provides street geocoding and SGID data search (300+ layers). Address-to-district lookup uses geocoding + SGID political layer query. No explicit rate limits documented; usage must be instrumented.
- **Session awareness:** Utah legislative sessions run roughly January–March. Bill search must handle inter-session periods gracefully by surfacing recent past-session activity.

### Integration Requirements

- **Utah Legislature API:** Developer token; endpoints for legislators by chamber/district, bill list by session with timestamp-based change detection, individual bill detail. Data available back to 2016.
- **UGRC Geocoding API:** Street + zone geocoding → lat/long → SGID political layer → district resolution.
- **Rep contact info:** Legislature API contact data does not reliably distinguish cell, district office, or chamber switchboard. MCP tool must surface the number with its API-provided label and flag type ambiguity explicitly — switchboard contact is far less effective than a direct line.
- **Email/SMS delivery:** mailto: URI for email; Clipboard API for text/SMS.

### Risk Mitigations

- **Data accuracy:** A bill or vote surfaced incorrectly can embarrass users — the exact failure mode this product exists to prevent. MCP tool responses must include source citation (bill number, session, vote date). System prompt must instruct the LLM to present retrieved data as verifiable fact, not assertion.
- **Political framing:** The tool is designed for progressive Utahns but must remain non-partisan in data presentation. Any constituent can use it regardless of political alignment. The LLM must not editorialize the legislator's record.

## Innovation & Novel Patterns

### Detected Innovation Areas

**MCP-First Civic Engagement**
Legislator lookup and bill search are discrete MCP tools — composable, replaceable, and extensible to other chatbot ecosystems and future states. This is a fundamentally different architecture from existing civic tech, which is predominantly form-based or static-content-driven.

**Bring-Your-Own-LLM (BYOLLM)**
The MVP delivers value through the user's own chatbot subscription (Claude.ai, ChatGPT, etc.). MCP tools provide structured data; the user's LLM provides reasoning and drafting. No inference costs for the operator, no additional subscription for the user, and output quality scales with the user's model tier. The approach is experimental — MCP support and system prompt behavior vary across platforms — with a clear on-device / hosted LLM fallback path if BYOLLM proves too high-friction.

**Specificity as Civic Mechanism**
The product is built around a theory of change: one specific, personal, bill-grounded message from a constituent in a legislator's district is more impactful than hundreds of form letters. This reframes civic engagement from a volume problem to a quality problem.

### Market Context & Competitive Landscape

Existing tools (Resistbot, VoterVoice, advocacy org form letters) optimize for volume and low friction, producing identical messages that legislative staff have learned to discount. Write Your Legislator optimizes for credibility and personalization. No known tool combines GIS-based legislator identification, live legislative data lookup, and conversational LLM drafting in a single constituent-facing flow.

### Validation Approach

- **BYOLLM:** Test end-to-end across Claude.ai and ChatGPT Free/Plus during development. If MCP connectivity, system prompt adherence, or output quality is inconsistent, escalate on-device LLM evaluation before committing to hosted inference.
- **Specificity:** Qualitative review of generated drafts by 3–5 Elevate Utah attendees before public launch. Success: users report the draft sounds like them and references something real.
- **Echo chamber hypothesis:** Anecdotal validation only — any legislator acknowledgment of increased specific constituent contact is meaningful signal.

### Risk Mitigation

- **BYOLLM friction:** On-device LLM (WebLLM, Transformers.js, Apple Intelligence, Gemini Nano) is the first fallback — no server costs, no privacy concerns. Hosted LLM is the second fallback, requiring external budget.
- **Platform MCP divergence:** System prompt injection and tool-call behavior vary across platforms. Test matrix covers Claude.ai and ChatGPT at minimum; behavioral differences documented as known limitations.
- **Onboarding burden:** BYOLLM novelty creates documentation and support burden. Landing page onboarding must be optimized for non-technical users.

## Web Application Requirements

### Architecture Overview

Single Page Application with a statically generated, SEO-optimized landing page and a conversational chatbot UI. The landing page explains the tool and BYOLLM setup. The SPA handles onboarding and any future hosted-LLM UI. MCP tools run as a separate backend service.

### Browser & Device Support

- Modern evergreen browsers: Chrome, Firefox, Safari, Edge (current and prior major version)
- Mobile browsers (iOS Safari, Android Chrome) must work well at MVP — first users will access the tool on phones directly after Elevate Utah meetings
- No IE11 or legacy browser support

### SEO & Discoverability

- SEO applies to the landing page only; chatbot UI is not indexed
- Target keywords: "contact Utah legislator," "write my state representative Utah," "email Utah state senator"
- Open Graph tags for social sharing (PAC members will share links)

### Hosting

- **Frontend:** Vercel or Netlify free tier — static site + SPA routing, automatic GitHub deploys, zero ops
- **MCP backend:** Railway, Render, or Fly.io free/hobby tier; public HTTPS endpoint with Let's Encrypt TLS required for chatbot platform connectivity
- **Azure fallback:** Azure Static Web Apps + Azure Container Apps if free tiers prove insufficient; no Kubernetes
- MVP traffic is PAC-meeting-scale; no autoscaling required at launch

### Implementation Notes

- SPA framework selection deferred to architecture phase (React, Vue, Svelte all viable)
- Legislature data cache runs as part of the MCP backend; no separate database required at MVP
- Open-source from day one; new contributors must be able to run the stack from the README alone

## Functional Requirements

### Constituent Identification

- **FR1:** A constituent can enter their home address to identify their Utah state House and Senate representatives
- **FR2:** The system can resolve a Utah street address to the correct legislative districts via GIS lookup
- **FR3:** A constituent can view both their House and Senate representatives and select which one to contact
- **FR4:** The system can surface a legislator's name, chamber, district, and available contact information alongside identification results
- **FR5:** The system can surface the type of contact number (cell, office, or switchboard) where known, and flag ambiguity where the type is unclear

### Legislative Research

- **FR6:** The system can retrieve bills sponsored or co-sponsored by a specific Utah legislator for the current or most recent legislative session
- **FR7:** The system can retrieve a specific bill's summary, status, and the identified legislator's vote record
- **FR8:** The system can search bills by issue theme (healthcare, education, housing, redistricting, etc.) filtered to a specific legislator
- **FR9:** The system can surface relevant bills from past sessions when the legislature is not in active session
- **FR10:** The system can cache legislative data locally and refresh on schedule (bills/votes: up to hourly; legislators: up to daily)
- **FR11:** The system can maintain a per-legislator bill index derived from session-level bill data

### Guided Issue Discovery

- **FR12:** A constituent can describe their concerns in their own words, including personal stories and family situations, to initiate the drafting flow
- **FR13:** The chatbot can guide a constituent who does not know which specific bill or issue they care about through open-ended issue elicitation
- **FR14:** A constituent can confirm or refine the issue and legislator context surfaced by the chatbot before draft generation begins
- **FR15:** A constituent can specify the desired medium for their message (email or text/SMS)
- **FR16:** A constituent can specify the desired formality level for their message

### Message Composition

- **FR17:** The system can generate a draft message grounded in the constituent's stated concerns and the legislator's specific legislative record, without editorializing the legislator's positions
- **FR18:** The system can generate a draft appropriate in length for the chosen medium (email: multi-paragraph; text: brief)
- **FR19:** The system can include a source citation in the draft (bill number, session, vote date) so the constituent can verify referenced facts before sending
- **FR20:** A constituent can review the generated draft and request revisions
- **FR21:** The system can revise a draft message based on constituent feedback

### Message Delivery

- **FR22:** A constituent can open a draft email directly in their system email client or web email provider via a one-action trigger
- **FR23:** A constituent can copy a draft text/SMS message to their clipboard for sending via their preferred messaging app
- **FR24:** A constituent can view the legislator's contact information (email address, phone/text number with type label) alongside the draft

### Chatbot Platform Integration (BYOLLM / MCP)

- **FR25:** The MCP legislator-lookup tool can be connected to and invoked by a user's existing chatbot platform (Claude.ai, ChatGPT, and compatible clients)
- **FR26:** The MCP bill-search tool can be connected to and invoked by a user's existing chatbot platform
- **FR27:** The system can provide a guided system prompt that instructs a connected chatbot to execute the 4-step civic drafting flow
- **FR28:** A developer or civic tech contributor can install and run the MCP tools locally from the public repository

### Onboarding & Public Discovery

- **FR29:** A visitor can access a landing page that explains the tool's purpose and how to connect it to their preferred chatbot
- **FR30:** A visitor can find the tool via search engines using civic-engagement-related search terms
- **FR31:** A visitor can navigate from the landing page to setup instructions for their specific chatbot platform
- **FR32:** A visitor can access the platform's privacy policy from the landing page
- **FR33:** A developer or civic tech contributor can access MCP tool documentation and local development setup instructions from the public repository

### Operator & System

- **FR34:** The operator can access structured logs of MCP tool requests and responses for debugging and error investigation
- **FR35:** The system can distinguish and log API errors (GIS, Legislature) separately from application logic errors
- **FR36:** The system can handle Utah Legislature API transient failures with automatic retry without surfacing errors to the user
- **FR37:** The system can handle non-residential or ambiguous addresses (P.O. Boxes, rural addresses) with a graceful error message and user guidance
- **FR38:** The operator can update the legislative data cache refresh schedule and data-provider configuration without redeploying the application

## Non-Functional Requirements

### Performance

- **NFR1:** Landing page achieves Lighthouse performance score ≥ 90 on mobile and desktop
- **NFR2:** Address-to-legislator GIS lookup completes in under 3 seconds under normal conditions
- **NFR3:** Bill/vote lookups served from local cache respond in under 1 second
- **NFR4:** The system displays a loading state for any operation expected to exceed 1 second

### Security

- **NFR5:** All traffic between users, web app, and MCP backend is served over HTTPS (TLS via Let's Encrypt)
- **NFR6:** Utah Legislature API developer token is stored as a server-side environment variable and never exposed to the client
- **NFR7:** The system does not persistently store user addresses, personal stories, or any PII beyond the duration of a session
- **NFR8:** The MCP backend public endpoint implements basic rate limiting to prevent abuse and automated scraping

### Scalability

- **NFR9:** System supports up to 100 concurrent sessions without performance degradation (PAC meeting spike scenario)
- **NFR10:** Legislative data cache serves all bill/legislator requests without per-request upstream API calls, enabling horizontal MCP backend scaling

### Accessibility

- **NFR11:** Web application meets WCAG 2.1 AA baseline at MVP: semantic HTML, full keyboard navigability, color contrast ≥ 4.5:1 for normal text, screen reader compatibility for the core chatbot flow
- **NFR12:** Mobile tap targets meet minimum 44×44px throughout the application

### Integration

- **NFR13:** MCP tools conform to the MCP specification version current at time of development, ensuring compatibility with Claude.ai, ChatGPT, and compliant clients
- **NFR14:** The legislative data provider is implemented behind an abstraction interface — swapping from the Utah Legislature API to a third-party provider requires no changes to the MCP tool's public interface
- **NFR15:** GIS address lookup degrades gracefully on API failure with a meaningful error message rather than a silent failure or crash

### Reliability

- **NFR16:** System targets 99% uptime on managed hosting free/hobby tier; major platform outages are outside operator control
- **NFR17:** Legislative data cache serves bill and legislator requests during Utah Legislature API outages using the most recently cached data
- **NFR18:** System is deployable by a new contributor following only the public README, without direct knowledge transfer from the original author
