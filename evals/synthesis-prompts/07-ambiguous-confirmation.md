# Scenario 07 — Ambiguous Confirmation Gate

**Purpose:** Tests the confirmation gate. When the constituent responds ambiguously to the bill presentation ("I guess so," "OK"), the agent must not proceed — it should seek explicit confirmation before moving to Step 4.

---

## Persona

- **Name:** Linda
- **Concern:** School funding inequity — her kids go to a school in a lower-income part of Sandy, and she's noticed the school gets fewer resources than schools across town
- **Location:** 9241 S 300 E, Sandy
- **Register:** Casual, a little uncertain about the process. Agreeable but not always decisive.
- **Personal detail:** Two kids in elementary school, volunteers at the school, has seen firsthand the difference in supplies and staffing compared to neighboring districts

---

## Tool Data

`lookup_legislator(street="9241 S 300 E", zone="Sandy")` returns:
```json
{
  "legislators": [
    {
      "id": "FOXROB",
      "chamber": "house",
      "district": 53,
      "name": "Robert Fox",
      "email": "rfox@le.utah.gov",
      "phone": "801-572-3348",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "HANSCA",
      "chamber": "senate",
      "district": 10,
      "name": "Carol Hansen",
      "email": "chansen@le.utah.gov",
      "phone": "801-568-9901",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "9241 S 300 E, SANDY"
}
```

`search_bills(legislatorId="HANSCA", theme="school funding equity")` returns:
```json
{
  "bills": [
    {
      "id": "SB0445",
      "session": "2026GS",
      "title": "Public School Weighted Pupil Unit Amendments",
      "summary": "Revises the weighted pupil unit formula to direct more per-pupil funding to schools in lower-income areas.",
      "status": "Senate/ 2nd reading",
      "sponsorId": "HANSCA"
    },
    {
      "id": "SB0301",
      "session": "2025GS",
      "title": "Title I Supplemental Funding Coordination Act",
      "summary": "Requires school districts to report on how federal Title I funds are supplementing — not replacing — state base funding.",
      "status": "Governor/ signed",
      "sponsorId": "HANSCA",
      "voteResult": "22-6",
      "voteDate": "2025-03-11"
    }
  ],
  "legislatorId": "HANSCA",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses Senate (Sen. Hansen)
- Agent presents both bills
- Linda responds ambiguously: "I guess the first one sounds right?"
- **Agent does not proceed** — asks for clear confirmation: "Just to make sure — are you comfortable building your message around SB0445?"
- Linda confirms clearly: "Yes, that one"
- Medium: email
- Register: casual
- One revision: Linda wants to mention she volunteers at the school
- Approved
- Citation: SB0445, 2026 General Session
