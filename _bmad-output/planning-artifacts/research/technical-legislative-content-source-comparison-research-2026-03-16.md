---
stepsCompleted: [1, 2]
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

---

## Integration Patterns Analysis

This section documents the concrete API integration patterns for each service, with specific focus on expressing on-record's primary query: *"find bills representative X voted on matching topic Y in session/year Z."*

### API Design and Authentication

All active services expose **REST JSON APIs** over HTTPS. Authentication is uniformly **API-key based**:

| Service | Key delivery | Notes |
|---|---|---|
| OpenStates v3 | `X-API-KEY` header or `?apikey=` query param | Free key via openstates.org |
| LegiScan | `?key=` query param | Free key via legiscan.com/legiscan-register |
| Congress.gov | `?api_key=` query param or `X-Api-Key` header | Free key via api.congress.gov |
| NY Senate | None required for read operations | Public access |
| Washington State | None required | Official SOAP service, no key |

No OAuth, no mTLS, no JWT across any of the primary services. All are read-only public APIs — no write operations exist.

_Source: [OpenStates API v3 Overview](https://docs.openstates.org/api-v3/), [LegiScan API](https://legiscan.com/legiscan), [Congress.gov API](https://api.congress.gov)_

---

### OpenStates v3 — Endpoint Inventory

The FastAPI application (`github.com/openstates/api-v3`) exposes these top-level route files: `bills.py`, `people.py`, `committees.py`, `events.py`, `jurisdictions.py`. **There is no `votes.py` — votes are not a top-level resource.**

**`GET /bills`** — the primary search endpoint
| Parameter | Type | Description |
|---|---|---|
| `jurisdiction` | string | State name or OCD jurisdiction ID |
| `session` | string | Session identifier (e.g. `2024`) |
| `chamber` | string | `upper`, `lower`, or `legislature` |
| `q` | string | Full-text search term |
| `subject` | string (repeatable) | Subject tag filter |
| `sponsor` | string | Filter by sponsor name or OCD person ID |
| `sponsor_classification` | string | `primary`, `cosponsor`, etc. |
| `identifier` | string (repeatable, max 20) | Bill number(s) |
| `classification` | string | `bill`, `resolution`, etc. |
| `updated_since` / `created_since` / `action_since` | ISO-8601 datetime | Recency filters |
| `sort` | string | `updated`, `first_action`, `latest_action` |
| `include` | enum (repeatable) | Inline embeds (see below) |

**`?include=` options on `/bills`:** `sponsorships`, `abstracts`, `other_titles`, `other_identifiers`, `actions`, `sources`, `documents`, `versions`, **`votes`**, `related_bills`

**`GET /people`** — legislator lookup
- Filters: `name` (partial match), `memberOf` (org name or OCD ID), `jurisdiction`, `district`, `party`

**Vote access**: Votes are accessible *only* via `?include=votes` on bill detail or bill list responses. There is no standalone `/votes` endpoint and **no ability to filter bills by who voted on them**. The `sponsor` filter covers sponsorship only.

**Rate limits (tiered):**
| Tier | Requests/minute | Requests/day |
|---|---|---|
| default (free) | 10 | 500 |
| bronze | 40 | 5,000 |
| silver | 80 | 50,000 |
| unlimited | 240 | ~unlimited |

_Source: [OpenStates api-v3 GitHub](https://github.com/openstates/api-v3), [Rate limit discussion](https://github.com/openstates/issues/discussions/205)_

---

### LegiScan — Endpoint Inventory

LegiScan uses a single base URL with an `op=` query parameter to select operation. All operations are `GET` requests returning JSON.

`https://api.legiscan.com/?key=API_KEY&op=OPERATION[&params]`

| Operation | Key parameters | Returns |
|---|---|---|
| `getSessionList` | `state` | All sessions for a state |
| `getMasterList` | `state` or `id` (session) | Bill ID + change_hash list for a session |
| `getMasterListRaw` | `state` or `id` | Same as above but raw format |
| `getBill` | `id` (bill ID) | Full bill with sponsors, actions, vote IDs |
| `getBillText` | `id` (doc ID) | Base64-encoded bill text |
| `getRollCall` | `id` (roll call ID) | Vote result with per-person votes |
| `getPerson` | `id` (person ID) | Individual legislator record |
| `getSessionPeople` | `id` (session ID) | All legislators active in a session |
| `getSponsoredList` | `id` (person ID) | Bills **sponsored** by person (not voted) |
| `getSearch` | `state`, `query`, `year`, `page` | Full-text search results |
| `getSearchRaw` | same | Raw search results |
| `getDatasetList` | `state`, `year` | Available bulk datasets |
| `getDataset` | `id` (session ID), `access_key` | Dataset ZIP (all bills + votes + people) |
| `getDatasetRaw` | same | Same but raw format |
| `getMonitorList` / `setMonitor` | — | Bill watch-list management |

**Critical gap**: `getSponsoredList` returns bills a person *sponsored*, not bills they *voted on*. There is no `getVotedList` or equivalent. To find all bills a person voted on, you must either:
1. Download the full session dataset (`getDataset`) and parse roll calls — O(1) API calls, local processing
2. Call `getMasterList` then `getBill` for every bill, then `getRollCall` for each vote on each bill — O(N×M) API calls, impractical against rate limits

**Full-text search** (`getSearch`) supports Boolean operators (`AND`, `OR`, `NOT`, `ADJ`), `state`, `year` (1=all, 2=current, 3=recent, 4=prior), and `page` pagination. Returns bill IDs + relevance scores.

_Source: [LegiScan API User Manual v1.91 (2025-03-17)](https://api.legiscan.com/dl/LegiScan_API_User_Manual.pdf), [Microsoft Connector Docs](https://learn.microsoft.com/en-us/connectors/legiscan/)_

---

### Congress.gov API v3 — Endpoint Inventory

`https://api.congress.gov/v3/...?api_key=KEY`

Primarily federal (House + Senate). Key endpoints:

| Endpoint | Description |
|---|---|
| `/member` | All members (paginated, unfiltered) |
| `/member/{bioguideId}` | Member biography and metadata |
| `/member/{bioguideId}/sponsored-legislation` | Bills sponsored by member |
| `/member/{bioguideId}/cosponsored-legislation` | Bills cosponsored by member |
| `/member/congress/{congress}` | All members in a Congress |
| `/member/congress/{congress}/{state}` | Members filtered by state |
| `/bill/{congress}/{billType}/{billNumber}` | Bill detail |
| `/bill/{congress}/{billType}/{billNumber}/cosponsors` | Bill cosponsor list |
| `/bill/{congress}/{billType}/{billNumber}/subjects` | Bill subject tags |
| `/bill/{congress}/{billType}/{billNumber}/text` | Bill text versions |

**House Roll Call Votes (Beta, 2025):** A beta endpoint was introduced in 2025 providing vote data from the 118th Congress forward, but the exact endpoint path and whether it supports filtering by member ID is not confirmed in current documentation. The `/member/{bioguideId}` record does not include a `voted-legislation` sub-resource. Rate limit: 5,000 req/hr; page sizes 20–250.

**No state coverage.** This API is strictly federal.

_Source: [Congress.gov Member Endpoint docs](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/MemberEndpoint.md), [R `congress` package](https://cran.r-project.org/web/packages/congress/congress.pdf)_

---

### Query Workflow Comparison: On-Record Primary Use Case

**Query:** *"Bills that representative X voted on, matching topic Y, in session/year Z"*

This requires three logical components: (1) person identity resolution, (2) vote record retrieval for that person, (3) topic/subject filtering.

#### OpenStates v3

```
Step 1: GET /people?jurisdiction=ut&name=Jane+Doe
        → returns person with ocd-person/... ID

Step 2: GET /bills?jurisdiction=ut&session=2025&q=education&include=votes
        → returns bills matching "education" with embedded vote arrays

Step 3: [client-side] filter bills where votes[].voters[].voter == ocd-person/...
```

**Round trips:** 2 API calls + client-side filtering. Scales poorly if topic is broad (many pages of bills to paginate through). Works well if topic is narrow (few results per page). Cannot reverse the query order (start from person, then filter to topic) — there is no "bills person X voted on" first step.

**Confidence:** High — confirmed from source code review.

#### LegiScan (on-demand approach)

```
Step 1: GET ?op=getSessionList&state=UT → find session ID for year Z
Step 2: GET ?op=getSessionPeople&id=SESSION_ID → find person ID for rep X
Step 3: GET ?op=getMasterList&id=SESSION_ID → list of all bill IDs (potentially 1000s)
Step 4: [for each bill] GET ?op=getBill&id=BILL_ID → get roll call IDs
Step 5: [for each roll call] GET ?op=getRollCall&id=RC_ID → check if person X voted
Step 6: Filter results by topic Y against bill titles/descriptions
```

**Round trips:** 2 + N (bills) + M (roll calls). Completely impractical against the 30,000 req/month free limit. Only viable with the push/enterprise tier.

#### LegiScan (bulk dataset approach)

```
Step 1: GET ?op=getDatasetList&state=UT → find dataset ID for session Z
Step 2: GET ?op=getDataset&id=DATASET_ID → download ZIP (~10-100MB)
Step 3: [local] unzip, parse people.json → find person X's people_id
Step 4: [local] iterate roll_call/*.json → collect bills where person X voted
Step 5: [local] match bill titles/descriptions against topic Y using local FTS
```

**Round trips:** 2 API calls, then all processing local. Highly efficient for batch/caching scenarios. Bulk dataset is updated weekly (Sunday) on all tiers; enterprise push tier updates every 4–15 minutes.

**Confidence:** High — confirmed from API manual.

#### Congress.gov (federal bills only)

```
Step 1: GET /member/congress/{congress}/{state} → find bioguideId for rep X
Step 2: GET /member/{bioguideId}/sponsored-legislation → sponsored bills only
        [no voted-on endpoint confirmed as production-ready]
Step 3: Filter by subject using /bill/.../{congress}/{type}/{num}/subjects
```

**Vote data gap**: Sponsored/cosponsored legislation endpoints exist but a "voted-on" endpoint is only available in beta (House Roll Call Votes, 118th Congress+). Not reliable for production use as of March 2026.

---

### Data Model Entity Shapes

#### Common entities across services

| Entity | OpenStates name | LegiScan name | Congress.gov name |
|---|---|---|---|
| Legislation | `Bill` | `Bill` | `Bill` |
| Lawmaker | `Person` | `Person` | `Member` |
| Vote event | `VoteEvent` | `RollCall` | *(beta, unnamed)* |
| Individual cast vote | *(embedded in VoteEvent)* | vote record in RollCall | *(beta)* |
| Legislative session | `LegislativeSession` | `Session` | `Congress` (not session) |
| Jurisdiction | `Jurisdiction` (OCD format) | `State` (2-letter abbr) | N/A (federal only) |
| Sponsorship | `Sponsorship` (classification field) | sponsor array in Bill | `Sponsor` |
| Subject/Topic | `Subject` (normalized tags) | *(full-text only, no structured tags)* | `PolicyArea` + `Subject` |

#### Notable structural differences

**Subjects/Topics**: OpenStates normalizes bills into a controlled vocabulary of `Subject` tags (e.g., "Education", "Health"). LegiScan has no structured subject taxonomy — topic filtering is only available through full-text search against bill title and description. Congress.gov has both a `policyArea` field (single primary category) and a `subjects` sub-resource (LOC's Legislative Indexing Vocabulary, fairly granular).

**Vote granularity**: OpenStates embeds individual voter records (`option`: yes/no/other/absent) within each `VoteEvent`. LegiScan's `getRollCall` returns per-person vote records keyed by `people_id`. Congress.gov's beta endpoint structure is unconfirmed.

**Session vs. year**: OpenStates uses session identifiers that vary by state (e.g., "2025" for Utah, "2023-2024" for California). LegiScan normalizes to a numeric `year` parameter (1=all, 2=current, 3=recent, 4=prior). Congress.gov uses `congress` numbers (118th, 119th) instead of calendar years.

**Identifier stability**: OpenStates OCD IDs (`ocd-person/UUID`) are stable across sessions. LegiScan `people_id` values are stable within the service. Congress.gov `bioguideId` values are the most stable (official Library of Congress identifiers, used since 1989).

_Source: [OpenStates api-v3/api/bills.py](https://github.com/openstates/api-v3/blob/main/api/bills.py), [LegiScan API Manual](https://api.legiscan.com/dl/LegiScan_API_User_Manual.pdf), [Congress.gov Member Endpoint docs](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/MemberEndpoint.md)_

---

### Bulk Data vs. On-Demand Access

The user's insight that GraphQL would elegantly solve the compound-query problem (person + vote + topic in a single traversal) is correct — and the retirement of OpenStates's v2 GraphQL API closed that door. The practical architectural implication for on-record:

- **On-demand REST** is suitable for: resolving a specific bill, looking up a legislator's profile, searching for bills matching a keyword in a given session.
- **Bulk dataset download** is the only practical path for: "all bills person X voted on in session Y" — particularly for LegiScan, and as a performance optimization for OpenStates when session-wide vote scanning is needed.
- **Cache layer design** (which on-record already has via better-sqlite3) should plan for ingesting bulk session datasets as a background job, rather than relying on per-request API calls for vote history queries.

The compound query naturally decomposes into: (1) one-time bulk ingest per session — person registry + roll call register, (2) live on-demand queries — bill detail, text search against cached index.

_Source: Research synthesis — confirmed through source code and API manual review_
