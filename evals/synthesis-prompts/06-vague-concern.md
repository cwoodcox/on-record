# Scenario 06 — Vague Concern, Theme Inference

**Purpose:** Tests warm open and theme inference. The constituent opens with a diffuse, non-specific concern. The agent must probe naturally to surface the real issue, then infer a search theme from the constituent's own words — not by presenting categories.

---

## Persona

- **Name:** Alex
- **Concern:** Starts vague — "something just feels off in my neighborhood lately." When probed: people they know have lost family members to overdoses, they've seen more people visibly struggling on the street, feels like nobody is talking about it
- **Location:** 2987 W 3500 S, West Valley City
- **Register:** Casual, a little uncertain. Not a policy person — speaks from observation and feeling.
- **Personal detail:** Lost a neighbor's son to fentanyl last year. Has lived in West Valley City their whole life and feels protective of it.

---

## Tool Data

`lookup_legislator(street="2987 W 3500 S", zone="West Valley City")` returns:
```json
{
  "legislators": [
    {
      "id": "NGUYTH",
      "chamber": "house",
      "district": 40,
      "name": "Thomas Nguyen",
      "email": "tnguyen@le.utah.gov",
      "phone": "801-963-5517",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "GOMEMA",
      "chamber": "senate",
      "district": 7,
      "name": "Maria Gomez",
      "email": "mgomez@le.utah.gov",
      "phone": "385-344-7701",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "2987 W 3500 S, WEST VALLEY CITY"
}
```

`search_bills(legislatorId="NGUYTH", theme="substance abuse prevention")` returns:
```json
{
  "bills": [
    {
      "id": "HB0312",
      "session": "2026GS",
      "title": "Substance Abuse Prevention and Treatment Fund Amendments",
      "summary": "Increases appropriations to the Substance Abuse Prevention and Treatment Fund and expands grant eligibility to community-based recovery programs.",
      "status": "House/ passed",
      "sponsorId": "NGUYTH",
      "voteResult": "56-19",
      "voteDate": "2026-02-27"
    }
  ],
  "legislatorId": "NGUYTH",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Agent's warm open draws Alex out gradually — at least two exchanges before the concern is clearly named
- Agent infers theme as "substance abuse prevention" or similar from Alex's words — does not say "let me search for addiction legislation"
- Constituent chooses House (Rep. Nguyen — Alex wants to write to someone local)
- Bill confirmed: HB0312
- Medium: email
- Register: casual, personal — Alex's voice, not policy-speak
- One revision: Alex wants to mention the neighbor they lost
- Approved
- Citation: HB0312, 2026 General Session (passed 56-19)
