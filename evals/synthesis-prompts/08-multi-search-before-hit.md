# Scenario 08 — Multiple Searches Before Hit, SMS

**Purpose:** Tests tool use across multiple searches before a bill is found. Agent re-infers the theme twice before hitting. Tests that the agent doesn't editorialize across failed searches, and that citation format works in SMS after a multi-step discovery.

---

## Persona

- **Name:** Carlos
- **Concern:** Small business survival — he runs a restaurant in Murray, margins are thin, he's struggling with the cost of health insurance for his employees and feels like small businesses get squeezed from every direction
- **Location:** 5540 Commerce Dr, Murray
- **Register:** Casual, direct, a little frustrated. Business owner energy — practical, not political.
- **Personal detail:** Owns a Mexican restaurant, 12 employees, has been open 6 years, almost had to close last year

---

## Tool Data

`lookup_legislator(street="5540 Commerce Dr", zone="Murray")` returns:
```json
{
  "legislators": [
    {
      "id": "PETEJE",
      "chamber": "house",
      "district": 44,
      "name": "Jennifer Peters",
      "email": "jpeters@le.utah.gov",
      "phone": "801-264-7732",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "LEEMI",
      "chamber": "senate",
      "district": 6,
      "name": "Michael Lee",
      "email": "mlee@le.utah.gov",
      "phone": "801-281-5509",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "5540 COMMERCE DR, MURRAY"
}
```

`search_bills(legislatorId="PETEJE", theme="small business support")` returns:
```json
{
  "bills": [],
  "legislatorId": "PETEJE",
  "session": "2026GS"
}
```

`search_bills(legislatorId="PETEJE", theme="small business health insurance")` returns:
```json
{
  "bills": [],
  "legislatorId": "PETEJE",
  "session": "2026GS"
}
```

`search_bills(legislatorId="PETEJE", theme="employer tax relief")` returns:
```json
{
  "bills": [
    {
      "id": "HB0267",
      "session": "2026GS",
      "title": "Small Employer Health Coverage Tax Credit Amendments",
      "summary": "Increases the state tax credit available to small employers who provide health insurance coverage to full-time employees.",
      "status": "House/ passed",
      "sponsorId": "PETEJE",
      "voteResult": "62-12",
      "voteDate": "2026-02-19"
    }
  ],
  "legislatorId": "PETEJE",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses House (Rep. Peters — closer, Carlos is practical)
- First search (small business support): empty — agent re-angles toward insurance costs
- Carlos asks to keep looking
- Second search (small business health insurance): empty — agent re-angles toward tax side
- Third search (employer tax relief): hit — HB0267
- Bill confirmed: HB0267
- Medium: text/SMS
- Register: casual, punchy — Carlos's voice
- One revision: Carlos wants to mention he's been open 6 years
- Approved
- Citation: trailing reference (SMS format): `re: HB0267, 2026 session`
