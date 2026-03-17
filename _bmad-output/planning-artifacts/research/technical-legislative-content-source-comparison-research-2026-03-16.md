---
stepsCompleted: [1]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'legislative content source comparison'
research_goals: 'Evaluate available third-party services (OpenStates, LegiScan, etc.) for US state and federal legislative content, document their APIs, assess data model quality and searchability for on-record use cases (e.g. "find bills X representative voted on matching Y topic this year")'
user_name: 'Corey'
date: '2026-03-16'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-16
**Author:** Corey
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

## Technical Research Scope Confirmation

**Research Topic:** legislative content source comparison
**Research Goals:** Evaluate available third-party services (OpenStates, LegiScan, etc.) for US state and federal legislative content, document their APIs, assess data model quality and searchability for on-record use cases (e.g. "find bills X representative voted on matching Y topic this year")

**Technical Research Scope:**

- Service Landscape — OpenStates, LegiScan, LegiLink, Congress.gov API, and others; market share / adoption
- API Documentation — Endpoints, search capabilities, authentication, rate limits
- Data Model Patterns — Common entity names (Bill, Legislator, Vote, Session, etc.), obvious structural patterns
- Search Quality — How easily queries like "bills a representative voted on matching topic X in year Y" can be expressed
- Notable State Sources — Any individual states known for high-quality programmatic access to their own data
- Out of scope — Detailed model-to-model comparison, migration effort assessment, individual state service deep-dives

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-16

<!-- Content will be appended sequentially through research workflow steps -->

## Technology Stack Analysis

### Service Landscape

The third-party legislative data aggregator space has consolidated around a small number of active services, with most civic-tech community activity concentrated on two platforms.

**Plural Open / OpenStates** (openstates.org / pluralpolicy.com/open) is the civic-tech community standard for open, free, multi-state legislative data. The project originated inside the Sunlight Foundation in the early 2010s, was adopted by Plural Policy (formerly Open States Inc.) in 2021, and moved under the Plural Policy brand in 2023. It aggregates data from all 50 states, DC, and Puerto Rico. The backend is written in **Python**, data is stored in **PostgreSQL** (monthly bulk dumps are published as `.pgdump` files), and the public API surface has migrated from a now-deprecated **GraphQL API (v2)** to a **REST JSON API (v3)** at `https://v3.openstates.org/`. Data is collected via open-source scrapers that run multiple times per day against official state legislative websites. The project is fully **open-source (MIT)** and free with no paid tiers.
_Source: [OpenStates API v3 Overview](https://docs.openstates.org/api-v3/), [OpenStates GitHub](https://github.com/openstates)_

**LegiScan** (legiscan.com) is the dominant commercial provider, covering all 50 states and Congress. It has over 20 years of development history and serves a broad customer base including lobbyists, government affairs professionals, journalists, and developers. The API (currently v1.91 per the March 2025 manual) exposes a **REST JSON API** with two access modes — pull (query-on-demand) and push (database replication). The internal technology stack is not publicly disclosed; based on API age and commercial positioning, a PHP or Java backend is plausible but unconfirmed. LegiScan has a **Microsoft Power Platform connector**, indicating enterprise integrations are a product focus. Pricing tiers range from a free public key (30,000 queries/month) to enterprise push replication (~$99/month to enterprise).
_Source: [LegiScan API](https://legiscan.com/legiscan), [LegiScan API Manual v1.91](https://api.legiscan.com/dl/LegiScan_API_User_Manual.pdf), [Microsoft Connector Docs](https://learn.microsoft.com/en-us/connectors/legiscan/)_

**Congress.gov API** (api.congress.gov) is the **Library of Congress's official federal-only REST API** (v3). It returns data in **JSON or XML** and covers bills, amendments, summaries, members, committee materials, nominations, and treaties. A beta **House Roll Call Votes** endpoint was introduced in 2025 covering votes from 2023 (118th Congress) forward, including a member-votes sub-level showing how each representative voted on specific legislation. Rate limit is 5,000 requests/hour; returns 20–250 results per call. Critically, the API experienced an outage in August 2025 — requests to `api.congress.gov/v3` entered an infinite redirect loop with no communication from the Library of Congress — highlighting institutional reliability risk.
_Source: [Congress.gov API at LOC](https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/), [House Roll Call Votes blog post](https://blogs.loc.gov/law/2025/05/introducing-house-roll-call-votes-in-the-congress-gov-api/), [GovTech API outage article](https://www.govtech.com/gov-experience/congress-govs-api-has-gone-dark-impacting-data-access)_

**ProPublica Congress API** — Federal-only, covers the House and Senate with vote records dating to 1989 (Senate) / 1991 (House), updated every 30 minutes for votes. However, **no new API keys are being issued**, effectively closing this service to new users. Not viable for new projects.
_Source: [ProPublica Congress API](https://projects.propublica.org/api-docs/congress-api/)_

**LegiStorm** (legistorm.com) focuses primarily on **congressional and state legislator biographical data** — staff, committee memberships, contact details, social media, and salary information — rather than bill tracking. It complements bill-tracking services rather than replacing them.
_Source: [LegiStorm API](https://info.legistorm.com/solutions/api)_

**LegiLink** — No platform specifically named "LegiLink" was found with any material web presence as of March 2026. The name may refer to a rebranded product, a white-label instance of another service, or an internal tool at a specific organization. It does not appear to be a market player of note.

**Sunlight Foundation APIs** (Capitol Words, Congress API, etc.) — Fully defunct. The Sunlight Foundation wound down operations and its APIs are no longer available. OpenStates is the surviving heir to Sunlight's civic-data work.
_Source: [Sunlight Foundation API page](https://sunlightfoundation.com/api/)_

---

### Programming Languages and Runtime Environments

The legislative data aggregation space does not have a dominant language; each service reflects its era of founding:

- **OpenStates (Python)**: Backend built in Python, scrapers in Python, official client library (`pyopenstates`) in Python. The v3 API uses SQLAlchemy for ORM and Pydantic for response schema validation — a modern, well-typed Python stack.
- **NY Senate Open Legislation (Java)**: Built and maintained in-house by the NY State Senate tech team, the Open Legislation service is a **Java-based Spring web application**. Data is ingested from raw LBDC (Legislative Bill Drafting Commission) feeds in near-real-time.
- **LegiScan**: Proprietary; technology not disclosed.
- **Congress.gov API**: Government-operated; technology not disclosed.

_Source: [OpenStates GitHub api-v3](https://github.com/openstates/api-v3), [NY Senate OpenLegislation GitHub](https://github.com/nysenate/OpenLegislation)_

---

### Database and Storage Technologies

- **OpenStates**: **PostgreSQL** is the canonical data store. Monthly bulk dumps are publicly available as `.pgdump` files. Bill and vote CSV/JSON exports are available per session. Geographic district boundary data is stored as JSON files derived from the Census Bureau.
- **LegiScan**: Enterprise push subscriptions enable **full database replication** into the customer's infrastructure, implying a relational structure. The 350GB full bill text training corpus available for licensing suggests large-scale document storage.
- **Congress.gov**: Data originates from the Library of Congress's internal systems and is served through the REST API; no public information on the underlying store.
- **NY Senate Open Legislation**: Java application; data ingested from LBDC raw text format into an internal store — open source but schema is NY-specific.

---

### Development Tools, Platforms, and Deployment

- **OpenStates** actively maintains geographic boundary data (`openstates-geo`, last updated Jan 2026) and tracks scraper audit health separately. The open-source codebase is on GitHub under the `openstates` organization. AI-powered analytics features are being layered on top of the core data platform by Plural Policy (2025–2026).
- **LegiScan** has a Microsoft Power Platform connector, a GAITS (Government Affairs Intelligence Tracking System) platform built on top of the API, and embeddable map/report widgets. These suggest a mature platform with SaaS tooling around the core data service.
- **Washington State Legislature** offers an official **SOAP (XML Web Services) API** — the only state we found with an official first-party SOAP API for real-time legislative data, covering amendments, committees, legislation, session law, and sponsors.
- **Digital Democracy** (CalMatters / Cal Poly, launched 2024) is an AI-powered California-focused legislative transparency platform. It provides a searchable public interface but its API surface is not documented publicly as of this research.

_Source: [Washington State SOAP API on data.gov](https://catalog.data.gov/dataset/legislative-web-services-soap-api), [SVCA Foundation API resource list](https://www.svcaf.org/comprehensive-api-resources-for-ai-driven-legislative-analysis/)_

---

### Technology Adoption Trends

- The **GraphQL era** (OpenStates v2) has passed. REST JSON is the current standard across all active services. SOAP (Washington State) is a legacy holdout.
- **Open Civic Data (OCD) identifiers** are an emerging standard: OpenStates uses OCD-format IDs (`ocd-person/...`, `ocd-jurisdiction/...`) that are consistent across sessions and jurisdictions, which is architecturally valuable for referential integrity.
- **Bulk data** is now table-stakes: every major service (OpenStates, LegiScan, Congress.gov) offers downloadable bulk datasets in addition to on-demand API access.
- **AI/ML feature layers** are being added on top of raw data aggregation by both OpenStates (Plural's AI tracker) and commercial platforms, but these are product-layer features, not data access improvements.
- **Reliability concerns**: Two significant service availability events occurred in 2025 — the Congress.gov API outage (August 2025) and the Google Civic Information API / OpenSecrets API shutdowns (April 2025). These signal that developer reliance on a single civic-data source carries meaningful risk.
_Source: [GovTech API outage](https://www.govtech.com/gov-experience/congress-govs-api-has-gone-dark-impacting-data-access), [Google Civic API turndown notice](https://groups.google.com/g/google-civicinfo-api/c/9fwFn-dhktA)_
