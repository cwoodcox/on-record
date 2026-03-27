# Scenario 10 — Healthcare, Emotional/Casual

**Purpose:** Tests validate-before-inform under high emotional load. The constituent's concern is visceral and personal. The agent must meet the emotional weight before pivoting — a perfunctory acknowledgment is especially wrong here. Also tests name capture woven naturally into acknowledgment.

---

## Persona

- **Name:** Robert
- **Concern:** Insulin costs — his 16-year-old daughter has Type 1 diabetes, their insurance changed, and their monthly insulin cost went from $35 to $340. He's rationing her doses. He's scared and angry.
- **Location:** 680 W Center St, Orem
- **Register:** Casual, emotional. Doesn't speak in full sentences when he's upset. Gets more composed as the conversation goes on but starts raw.
- **Personal detail:** Daughter's name is Emma, diagnosed at age 9, Robert has been managing her care for 7 years. He knows exactly what the insulin costs, exactly what the insurance change was.

---

## Tool Data

`lookup_legislator(street="680 W Center St", zone="Orem")` returns:
```json
{
  "legislators": [
    {
      "id": "STEWPA",
      "chamber": "house",
      "district": 68,
      "name": "Paul Stewart",
      "email": "pstewart@le.utah.gov",
      "phone": "801-224-5391",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "FRANCA",
      "chamber": "senate",
      "district": 15,
      "name": "Catherine Francis",
      "email": "cfrancis@le.utah.gov",
      "phone": "801-226-8843",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "680 W CENTER ST, OREM"
}
```

`search_bills(legislatorId="FRANCA", theme="insulin costs prescription drugs")` returns:
```json
{
  "bills": [
    {
      "id": "SB0095",
      "session": "2026GS",
      "title": "Prescription Drug Price Transparency Act",
      "summary": "Requires pharmaceutical manufacturers to report price increases over 10% annually and establishes a state insulin cost-sharing cap of $35 per month for insured residents.",
      "status": "Senate/ committee",
      "sponsorId": "FRANCA"
    }
  ],
  "legislatorId": "FRANCA",
  "session": "2026GS"
}
```

---

## Desired Outcome

- Agent's acknowledgment is substantive and specific — names what Robert is experiencing (rationing insulin, fear for his daughter) before any pivot
- Agent learns Robert's name naturally, woven into the acknowledgment — not a standalone ask
- Agent uses Robert's name a couple of times naturally through the conversation
- Constituent chooses Senate (Sen. Francis — the insulin cap in the bill is directly relevant)
- Bill confirmed: SB0095
- Medium: email
- Register: casual and personal — Robert's voice, first-person storytelling, Emma by name
- One revision: Robert wants to add that he's been rationing her doses and is scared
- Approved
- Citation: SB0095, 2026 General Session (still in committee — urgency angle)
