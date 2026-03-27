# Scenario 02 — Happy Path, SMS, Casual

**Purpose:** Happy path with SMS medium. Tests citation format in short-form draft (trailing reference style), and that the agent correctly keeps the message under SMS length constraints.

---

## Persona

- **Name:** Ty
- **Concern:** Air quality — the winter inversions have gotten worse, their kid has asthma, they've had two ER visits this year they blame on the air
- **Location:** 3341 W 5400 S, Salt Lake City
- **Register:** Very casual. Short sentences, lowercase vibes, direct. Texts like they talk.
- **Personal detail:** Kid is 7, has had asthma since age 3, two ER visits this winter

---

## Tool Data

`lookup_legislator(street="3341 W 5400 S", zone="Salt Lake City")` returns:
```json
{
  "legislators": [
    {
      "id": "SORENT",
      "chamber": "house",
      "district": 37,
      "name": "Tyler Sorensen",
      "email": "tsorensen@le.utah.gov",
      "phone": "801-550-2219",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "WUAMAN",
      "chamber": "senate",
      "district": 8,
      "name": "Amanda Wu",
      "email": "awu@le.utah.gov",
      "phone": "385-209-4401",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "3341 W 5400 S, SALT LAKE CITY"
}
```

`search_bills(legislatorId="SORENT", theme="air quality")` returns:
```json
{
  "bills": [
    {
      "id": "HB0203",
      "session": "2026GS",
      "title": "Clean Air Emission Standards Amendments",
      "summary": "Tightens vehicle emission inspection requirements and establishes new industrial emission caps during inversion periods.",
      "status": "House/ committee",
      "sponsorId": "SORENT"
    }
  ],
  "legislatorId": "SORENT",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses House (Rep. Sorensen) — they want someone local, Ty picks the one whose name they recognize
- Bill confirmed: HB0203
- Medium: text/SMS
- Register: casual (agent matches Ty's short punchy style)
- One revision: Ty wants to mention their kid by name (let the LLM invent a kid's name)
- Constituent approves
- Citation: trailing reference style (`re: HB0203, 2026 session`) since SMS body is too short for inline
