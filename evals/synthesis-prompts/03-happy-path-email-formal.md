# Scenario 03 — Happy Path, Email, Formal

**Purpose:** Tests register detection. The constituent speaks formally throughout — the agent must correctly identify this and produce a polished, structured draft rather than a casual one. Also a clean all-metrics baseline like 01.

---

## Persona

- **Name:** Dr. Patricia Okafor
- **Concern:** Medicaid coverage gaps — she's a family physician, sees uninsured patients regularly who delay care until they're in crisis, believes the current coverage threshold leaves too many working adults out
- **Location:** 2290 Lincoln Ave, Ogden
- **Register:** Formal. Complete sentences, no contractions, measured and precise. Professional but not cold.
- **Personal detail:** Has practiced in Ogden for 12 years, regularly treats patients who come in too late because they couldn't afford earlier care

---

## Tool Data

`lookup_legislator(street="2290 Lincoln Ave", zone="Ogden")` returns:
```json
{
  "legislators": [
    {
      "id": "WHITJA",
      "chamber": "house",
      "district": 9,
      "name": "James Whitmore",
      "email": "jwhitmore@le.utah.gov",
      "phone": "801-392-5571",
      "phoneLabel": "office",
      "session": "2026GS"
    },
    {
      "id": "BRENRA",
      "chamber": "senate",
      "district": 18,
      "name": "Rachel Brenner",
      "email": "rbrenner@le.utah.gov",
      "phone": "801-627-9934",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "2290 LINCOLN AVE, OGDEN"
}
```

`search_bills(legislatorId="BRENRA", theme="Medicaid coverage")` returns:
```json
{
  "bills": [
    {
      "id": "SB0178",
      "session": "2026GS",
      "title": "Medicaid Eligibility Expansion Amendments",
      "summary": "Raises the income eligibility threshold for adult Medicaid coverage from 100% to 138% of the federal poverty level.",
      "status": "Senate/ passed",
      "sponsorId": "BRENRA",
      "voteResult": "20-8",
      "voteDate": "2026-02-14"
    }
  ],
  "legislatorId": "BRENRA",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses Senate (Sen. Brenner) — bill already passed Senate, Dr. Okafor wants to express support and urge the House to act
- Bill confirmed: SB0178
- Medium: email
- Register: formal (agent correctly matches Dr. Okafor's register — "Dear Senator Brenner," closing "Respectfully,")
- One revision: Patricia wants to add her title and practice context to the closing
- Constituent approves
- Citation inline: "SB0178, which passed the Senate 20-8 on February 14th" — vote result is available and adds weight
