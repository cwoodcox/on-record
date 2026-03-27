---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Apple Intelligence models as the backend for the on-record conversational bot'
session_goals: 'Product angles, App Store requirements and review implications, time-to-launch estimates'
selected_approach: 'ai-recommended'
techniques_used: ['Constraint Mapping', 'What If Scenarios', 'Decision Tree Mapping']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Corey
**Date:** 2026-03-26

## Session Overview

**Topic:** Apple Intelligence models as the backend for the on-record conversational bot
**Goals:** Product angles (what this unlocks vs. cloud models), App Store requirements and review implications, realistic time-to-launch estimates

### Session Setup

on-record is a write-your-legislator iOS/web app where a conversational MCP-backed bot helps Utah constituents draft messages to state representatives. The bot currently calls cloud LLM APIs (Anthropic, OpenAI). This session explores what replacing or augmenting that with Apple Intelligence on-device models would unlock.

---

## Technique Selection

**Approach:** AI-Recommended
**Techniques:** Constraint Mapping → What If Scenarios → Decision Tree Mapping

---

## Constraint Map

### Constraint #1 — The Cost-Control Tradeoff
Self-hosted = full UI control but you pay per token. Apple Intelligence = zero inference cost but building inside Apple's UI constraints. The question isn't "can the model do the job" — it's "who pays, and does that change what you can build around it."

### Constraint #2 — The Send Friction Problem
Web apps can approximate send (share sheet, mailto, gmail redirect) but can't own the action. Native iOS can launch a mail composer inside the app — the user never leaves, draft pre-loaded. Going native for Apple Intelligence is potentially a two-for-one: on-device model AND owned send step.

### Constraint #3 — Device Floor for Apple Intelligence
Requires iPhone 15 Pro / A17 Pro or newer, OR any iPhone 16 model (8GB RAM threshold). ~30-40% of active iPhones today, growing fast. Early adopter / politically engaged skew toward newer hardware reduces this as a real constraint.

### Constraint #4 — Device Floor Is Shrinking Fast
Every iPhone 16 sold expands the addressable market. By 2027 it'll be most active iPhones. iOS-first with Apple Intelligence is a bet on where the market is going, not where it is.

### Constraint #5 — Apple as a Distribution Partner, Not Just a Platform
Apple actively features apps showcasing Apple Intelligence with civic/accessibility narratives. An app that helps citizens engage government — on-device, private, no account — is exactly the story Apple's editorial team pitches to leadership. Apple Intelligence is a Trojan horse into Apple's marketing machine. The feature is the pitch deck.

### Constraint #6 — Target User's Confidence Gap Is the Product
"Civically minded, doesn't engage because they don't feel qualified" is a precise user. Already values-aligned, just needs scaffolding to feel like their voice counts. The warm open, validated concern, cited bill — that flow is already designed for this person.

### Constraint #7 — On-Device Is the Ethical Stack, Not Just the Privacy Stack
The protest-going civic user isn't just worried about their own data. They're concerned about data center energy footprints, training data scraping, concentration of AI power, what OpenAI does with their political speech. "Your data never leaves your phone" isn't technically necessary — it's psychologically necessary. Also covers environmental and ethical objections. "AI that doesn't snitch" is the unlock, not the privacy policy.

### Constraint #8 — The Address Has to Go Somewhere, and It's the State
Even fully on-device AI, the address still hits the UGRC geocoding API and Utah Legislature API. The honest story: "Your data goes directly to Utah's own government APIs — the same as if you looked up your rep on le.utah.gov. It never touches an AI company." Stronger and more defensible than on-device alone implies.

### Constraint #9 — Auth Is Not the Blocker for On-Device API Calls
UGRC's API key is a public-service key, not a billing credential. Safe to bundle in the app. The address lookup can go device → state API with no server in the path and no secret worth stealing.

### Constraint #10 — Protest Is a Distribution Moment, Not an Activation Moment
The job at the protest is install, not workflow completion. The real UX challenge is the couch an hour later. What pulls them back into the app after the install?

### Constraint #11 — The Sponsored-Bills-Only Limitation Blocks Major Legislation
`search_bills` only surfaces legislation the constituent's rep sponsored. For a constitutional amendment — or any major statewide bill — the user's rep may have nothing to do with sponsorship but every constituent has standing to weigh in. The app currently can't help someone write about the most important legislation of a session.

### Constraint #12 — The App Needs Civic Knowledge to Navigate the Process
A constitutional amendment comes through as a Joint Resolution (SJR/HJR), not a bill. The bot needs to know what to do with it, and the constituent needs to understand why it matters. That's a domain knowledge problem baked into the system prompt — and it's actually a feature, since it's the confidence-building the target user specifically needs.

### Constraint #13 — Precedent Exists, Time Won't
Last year's failed amendment means the process is documented, legal orgs are engaged, and constituents who participated are primed to act again. But the "too last-minute" pattern may repeat — the window between session announcement and vote could be days. The app already live when the session is called wins. The app still being built is irrelevant.

---

## What If Scenarios

### What If #1 — The Serverless Civic App
CDN-hosted SQLite bill database refreshed nightly, synced to CoreData on first launch. All inference on-device via Foundation Models. UGRC geocoding direct from device. No running server, no per-request cost, no user data touches your infrastructure. Scales to 100,000 users for the same cost as 10. Your backend is effectively a cron job and an S3 bucket.

### What If #2 — Airplane Mode Civic App
After first address lookup, district and rep data stored locally. Bill database already synced. Subsequent sessions fully offline — draft, revise, finalize with zero connectivity. Message queues and sends when signal returns. Works at protests in parking garages, rural areas, subway platforms. The "I'll do it later" failure mode disappears.

### What If #3 — The Legislative Calendar Hook
On install, prompt for address (30 seconds). Store district and reps. Monitor bill database for upcoming votes from their legislators. Fire one well-timed push: "HB 112 gets a Senate vote in 2 days. Want to reach Sen. Park before it happens?" Urgency is real, personalization is real. Turns a protest install into a time-bounded activation event.

### What If #4 — Ship for the Special Session
An app that helps citizens contact their legislators launches the week a special session is called to strip citizens of initiative power. The irony is the story. Apple Intelligence + special session timing + constitutional stakes = local news, political networks, and Apple's editorial radar simultaneously. You don't need a marketing budget if the news cycle hands you the frame.

### What If #5 — Two-Track Launch
Ship the web app / ChatGPT app for the special session — conversational flow already built, just needs the send problem addressed. Capture the news cycle, validate real users, collect stories. Build native Apple Intelligence app as v2 with a proper launch moment. The special session gives you real users and a story. Apple Intelligence gives you the product you want to build. Sequence them.

### What If #6 — Native First, Apple Intelligence Second
Ship a native SwiftUI app that calls the existing MCP server for the special session — no Apple Intelligence yet, just a clean chat UI and native mail composer. The hard part is already built. Add Foundation Models in a subsequent update once validated. Get the send mechanics and native experience for April 30. Add the Apple Intelligence narrative for the follow-up second news cycle.

### What If #7 — ChatGPT App as Prototype, Native as Product
Ship the ChatGPT app integration now (it works today, needs prompt fix). Use it to validate that people actually go through the full flow and want to send messages. Then build the native app with Apple Intelligence as the real product, with actual data on where the ChatGPT app dropped off. The ChatGPT app isn't the end game — it's a free usability test with real users.

### What If #8 — The Prompt Fix Is the Critical Path
The ChatGPT app is one system prompt fix away from being shippable. Citation flexibility — gracefully handling zero-result fallback — is exactly what scenario 04 in the evals harness is testing. E5-3 and the prompt rewrite aren't separate tracks from "ship something for the special session" — they're the same track.

### What If #9 — Decouple Bill Discovery from Legislator Identity
Split the flow — find what to write about (any bill, statewide) separately from who to write to (still the constituent's rep). "Here's the constitutional amendment. Your rep is Sen. Park. They haven't sponsored it but they vote on it — want to tell them how you feel?" Unlocks the app for every major statewide issue. Completely changes the value proposition. Statewide bill search is an afternoon of work on the existing API.

### What If #10 — Ship the Easy Fix, Don't Wait for the Right Fix
Add statewide bill search without legislator constraint now. Vote data via OpenStates is weeks of work. The special session won't wait. Ship the easy fix, migrate to OpenStates after — the cache layer survives unchanged per CLAUDE.md.

---

## Open Questions

1. **Foundation Models Entitlement Requirements** — Does shipping `FoundationModels` require a special entitlement, an Apple review process, or is it open to any paid developer account? Is there a "works with Apple Intelligence" badge process?

2. **Joint Resolution / Constitutional Amendment Process** — Does the amendment show up searchably in the Utah Legislature API as an SJR/HJR? What's the right constituent ask and at what stage does contact actually matter?

---

## Idea Organization and Prioritization

### Thematic Clusters

**Theme 1: Architecture — The Zero-Infrastructure Stack**
What If #1, #2, Constraints #8, #9 — All inference on-device, bill data synced as static files, UGRC direct from device. No server, no per-request cost, no data intermediary.

**Theme 2: Distribution — Apple as a Partner**
Constraint #5, #4, What If #4 — Apple editorial consideration, device floor shrinking, special session as launch event.

**Theme 3: The Ethical Narrative**
Constraints #6, #7, #8 — Privacy + environmental + ethical objections all handled by on-device. "AI that doesn't snitch." Target user already values-aligned, needs scaffolding.

**Theme 4: Critical Path to Shipping**
Constraints #11, #13, What If #8, #9, #10 — Prompt fix + statewide search unblocks ChatGPT ship. Precedent exists. Time won't. App already live when session is called wins.

**Theme 5: The Sequencing**
What If #5, #6, #7, #3 — ChatGPT app → special session → native iOS → Apple Intelligence. Each stage validates the next.

### Priority Stack

| Priority | Action | Unblocks |
|---|---|---|
| 1 | Fix system prompt citation flexibility (zero-result fallback) | ChatGPT app ship |
| 2 | Add statewide bill search to MCP (no legislator constraint) | Special session use case |
| 3 | Research resolution/amendment process + timing | Message framing |
| 4 | Ship ChatGPT app | Real users, real data |
| 5 | Build SwiftUI app (calls existing MCP server) | Native send mechanics, April 30 |
| 6 | Add Foundation Models | V2 narrative, Apple editorial pitch |

### Breakthrough Concepts

- **The Serverless Civic App**: Architecture where you are not a data intermediary at all — bill data is public, address goes to the state, inference is on-device. Zero infrastructure that touches user data.
- **The Ethical Permission Slip**: On-device AI addresses privacy, environmental, and ethical objections simultaneously for exactly the target user. It's the objection handler, not just a technical choice.
- **E5-3 Is on the Critical Path**: The evals work isn't academic — fixing citation flexibility to pass those tests is what ships the ChatGPT app.

---

## Session Summary

The central insight: Apple Intelligence was the starting question but the real answer is that **every constraint points the same direction** — on-device model, native iOS, direct state API calls, no data intermediary. The cost argument, the send mechanics argument, the distribution argument, and the ethical narrative argument all converge on the same architecture.

The near-term path is clear: the ChatGPT app ships when the prompt is fixed. The native app ships when the SwiftUI wrapper is built. Apple Intelligence ships when there's time to do it properly. The special session is the forcing function for steps 1-5.

What to do this week: fix the prompt, add statewide search, research the resolution process.
