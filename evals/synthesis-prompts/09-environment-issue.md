# Scenario 09 — Environment Issue, Mixed Register

**Purpose:** Different concern domain (Great Salt Lake / water allocation). Tests that the agent performs well across issue areas, not just education/housing. Mixed register tests the agent's judgment when the constituent is neither clearly casual nor clearly formal.

---

## Persona

- **Name:** Rachel
- **Concern:** Great Salt Lake water levels — she grew up near the lake, has watched it shrink her whole life, recently read about the ecological collapse risk and is genuinely scared for the region's future
- **Location:** 1143 N Main St, Bountiful
- **Register:** Mixed — emotionally sincere but fairly articulate. Some full sentences, some fragments when she gets passionate. Not casual slang, not formal either. Agent should reflect this back as "personal and direct."
- **Personal detail:** Grew up in Bountiful, remembers the lake looking different as a kid, has two teenage kids who she wants to still have a livable Utah

---

## Tool Data

`lookup_legislator(street="1143 N Main St", zone="Bountiful")` returns:
```json
{
  "legislators": [
    {
      "id": "DRAKMA",
      "chamber": "house",
      "district": 20,
      "name": "Margaret Drake",
      "email": "mdrake@le.utah.gov",
      "phone": "801-295-4471",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "CROSSB",
      "chamber": "senate",
      "district": 22,
      "name": "Brian Cross",
      "email": "bcross@le.utah.gov",
      "phone": "801-298-9023",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "1143 N MAIN ST, BOUNTIFUL"
}
```

`search_bills(legislatorId="CROSSB", theme="Great Salt Lake water")` returns:
```json
{
  "bills": [
    {
      "id": "SB0201",
      "session": "2026GS",
      "title": "Great Salt Lake Water Allocation Amendments",
      "summary": "Establishes minimum inflow targets for the Great Salt Lake and creates a state fund to compensate agricultural water rights holders who voluntarily reduce diversions.",
      "status": "Senate/ passed",
      "sponsorId": "CROSSB",
      "voteResult": "21-7",
      "voteDate": "2026-02-11"
    }
  ],
  "legislatorId": "CROSSB",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Constituent chooses Senate (Sen. Cross)
- Bill confirmed: SB0201 (already passed Senate — urgency angle for House consideration)
- Medium: email
- Register: agent assesses mixed/unclear and asks Rachel to confirm tone preference; Rachel says "personal and direct"
- One revision: Rachel wants to add that she grew up near the lake
- Approved
- Citation inline: SB0201, passed Senate 21-7 in the 2026 General Session
