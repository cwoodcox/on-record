# Scenario 01 — Happy Path, Email, Casual

**Purpose:** Primary calibration case. All steps execute correctly, bill found on first search, email draft produced and revised. Should score well on every metric. Use this as the known-good baseline.

---

## Persona

- **Name:** Jordan
- **Concern:** Housing affordability — rent has gone up 40% in two years, neighbors are being priced out, feels like the city is changing around them
- **Location:** 847 N Freedom Blvd, Provo
- **Register:** Casual. Uses contractions, "like", some mild frustration. Not angry — more tired and worried.
- **Personal detail:** Has lived in Provo for 8 years, rents an apartment, worried they'll have to leave the city they love

---

## Tool Data

`lookup_legislator(street="847 N Freedom Blvd", zone="Provo")` returns:
```json
{
  "legislators": [
    {
      "id": "CHENMA",
      "chamber": "house",
      "district": 61,
      "name": "Maria Chen",
      "email": "mchen@le.utah.gov",
      "phone": "801-491-3302",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "PARKDA",
      "chamber": "senate",
      "district": 16,
      "name": "David Park",
      "email": "dpark@le.utah.gov",
      "phone": "801-319-8847",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "847 N FREEDOM BLVD, PROVO"
}
```

`search_bills(legislatorId="PARKDA", theme="housing affordability")` returns:
```json
{
  "bills": [
    {
      "id": "SB0112",
      "session": "2026GS",
      "title": "Affordable Housing Development Incentives",
      "summary": "Provides tax incentives to developers who include below-market-rate units in new residential projects in high-cost counties.",
      "status": "Senate/ 3rd reading",
      "sponsorId": "PARKDA"
    },
    {
      "id": "SB0088",
      "session": "2025GS",
      "title": "Rental Assistance Fund Amendments",
      "summary": "Expanded eligibility criteria for the state emergency rental assistance fund.",
      "status": "Governor/ signed",
      "sponsorId": "PARKDA",
      "voteResult": "24-4",
      "voteDate": "2025-03-06"
    }
  ],
  "legislatorId": "PARKDA",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses Senate (Sen. Park)
- Bill confirmed: SB0112 (the current-session one in 3rd reading — timely angle)
- Medium: email
- Register: casual (agent correctly reads Jordan's voice)
- One revision: Jordan adds that they've lived there 8 years
- Constituent approves final draft
- Citation in draft: SB0112, 2026 General Session
