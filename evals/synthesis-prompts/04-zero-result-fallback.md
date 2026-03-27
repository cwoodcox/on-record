# Scenario 04 — Zero Result Fallback

**Purpose:** Tests the zero-result path. Two searches come up empty; agent offers to proceed without a bill citation. Draft must contain no fabricated legislation. CitationFormat metric should score the *absence* of a citation as correct.

---

## Persona

- **Name:** Sarah
- **Concern:** Teen mental health — her daughter's school counselor was cut, there's a six-month wait for any therapist in the area, she's watched her daughter struggle with anxiety all year with nowhere to turn
- **Location:** 1822 Gentile St, Layton
- **Register:** Casual but measured. Not venting — more quietly exhausted.
- **Personal detail:** Daughter is 15, has been on a therapy waitlist for six months, the school counselor was cut mid-year

---

## Tool Data

`lookup_legislator(street="1822 Gentile St", zone="Layton")` returns:
```json
{
  "legislators": [
    {
      "id": "OLSEKE",
      "chamber": "house",
      "district": 14,
      "name": "Kevin Olsen",
      "email": "kolsen@le.utah.gov",
      "phone": "801-544-7723",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "RIVETA",
      "chamber": "senate",
      "district": 20,
      "name": "Tanya Rivera",
      "email": "trivera@le.utah.gov",
      "phone": "801-510-6382",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "1822 GENTILE ST, LAYTON"
}
```

`search_bills(legislatorId="RIVETA", theme="teen mental health")` returns:
```json
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}
```

`search_bills(legislatorId="RIVETA", theme="youth counseling")` returns:
```json
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses Senate (Sen. Rivera)
- First search (teen mental health): empty
- Agent offers alternative angle — Sarah asks to try youth counseling
- Second search (youth counseling): empty
- Agent offers to proceed without a bill — Sarah agrees
- Medium: email
- Register: casual, personal
- Draft references Sarah's daughter's situation without citing any bill
- **No citation in draft** — this is correct behavior, not a gap
- One revision: Sarah wants to add that she's a taxpayer and voter
- Constituent approves
