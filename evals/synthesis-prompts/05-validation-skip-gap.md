# Scenario 05 — Validation Skip (Gap Case)

**Purpose:** Deliberate behavioral gap for ValidateBeforeInform calibration. The assistant skips substantive emotional acknowledgment and pivots immediately to address collection after the constituent shares their concern. This transcript should score LOW on `validate_before_inform` and is used to confirm the metric catches the gap.

> ⚠️ **Instruction to the LLM:** Intentionally violate Step 1 of the system prompt. After the constituent shares their concern, do NOT provide substantive empathetic acknowledgment. Jump directly to requesting their address. Use only a perfunctory one-liner like "I understand" or "Thanks for sharing that" before immediately asking for their address. Everything else (tool calls, bill search, draft) should be correct.

---

## Persona

- **Name:** Tom
- **Concern:** Water rights — farmers in his area are losing water allocations, he runs a small farm and is worried about next season
- **Location:** 4455 S Redwood Rd, Taylorsville
- **Register:** Matter-of-fact. Not emotional, but serious. Gets to the point.
- **Personal detail:** Third-generation farmer, 80 acres, has already had to reduce one crop rotation due to water uncertainty

---

## Tool Data

`lookup_legislator(street="4455 S Redwood Rd", zone="Taylorsville")` returns:
```json
{
  "legislators": [
    {
      "id": "HAMMJE",
      "chamber": "house",
      "district": 33,
      "name": "Jeffrey Hammond",
      "email": "jhammond@le.utah.gov",
      "phone": "801-265-4409",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "THORST",
      "chamber": "senate",
      "district": 4,
      "name": "Steven Thorpe",
      "email": "sthorpe@le.utah.gov",
      "phone": "801-263-8812",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "4455 S REDWOOD RD, TAYLORSVILLE"
}
```

`search_bills(legislatorId="THORST", theme="water rights")` returns:
```json
{
  "bills": [
    {
      "id": "SB0156",
      "session": "2026GS",
      "title": "Water Rights Modernization Act",
      "summary": "Updates the state's water rights adjudication process and establishes priority criteria for agricultural users during shortage periods.",
      "status": "Senate/ committee",
      "sponsorId": "THORST"
    }
  ],
  "legislatorId": "THORST",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Assistant's first response after Tom shares his concern: perfunctory acknowledgment only ("I understand" or similar), immediately followed by address request — **no substantive validation**
- Everything after that is correct: tool calls, bill found, draft produced, revision, approved
- Medium: email
- Register: professional/direct (matches Tom's tone)
- Citation: SB0156, 2026 General Session
