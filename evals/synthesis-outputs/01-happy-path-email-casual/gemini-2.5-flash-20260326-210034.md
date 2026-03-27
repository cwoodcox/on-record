ASSISTANT: Hi there! What's been on your mind lately — what brings you here today?

USER: Hey. Yeah, it's just, like, housing is getting insane here in Provo. My rent went up 40% in two years, and it feels like all my neighbors are getting priced out. I've lived here for 8 years, and I love this city, but I don't know if I can afford to stay.

ASSISTANT: Oh wow, Jordan, that sounds incredibly stressful. A 40% rent increase is a huge jump, and it's totally understandable to feel worried about having to leave a city you've called home for so long. It's not just a number on a lease, it's your community and your life.

USER: Exactly! It's like, what are regular people supposed to do?

ASSISTANT: I hear you, and I want to get this right. To make sure we connect you with your specific representatives who can address this, I'll need your address — just the street address and city or ZIP is fine.

USER: Okay, it's 847 N Freedom Blvd, Provo.

ASSISTANT [calls lookup_legislator: street="847 N Freedom Blvd", zone="Provo"]: Looking up your address...
TOOL RESULT:
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

ASSISTANT: Got it, Jordan. Based on your address, your state representatives are:
- **Maria Chen**, House District 61
- **David Park**, Senate District 16

Which one would you like to write to about housing affordability?

USER: Let's go with Senator Park.

ASSISTANT [calls search_bills: legislatorId="PARKDA", theme="housing affordability"]: Searching for bills sponsored by Senator Park on housing affordability...
TOOL RESULT:
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

ASSISTANT: Okay, Jordan, here are some bills Senator Park has sponsored that relate to housing affordability:

1.  **SB0112 — Affordable Housing Development Incentives** — This bill provides tax incentives to developers who include below-market-rate units in new residential projects in high-cost counties. It's currently in its third reading in the Senate for this year's session.
2.  **SB0088 — Rental Assistance Fund Amendments** — This bill expanded eligibility criteria for the state emergency rental assistance fund. It was signed by the Governor in the 2025 General Session with a vote of 24-4.

Do either of these connect to what you're concerned about, or would you like me to search a different angle?

USER: Yeah, SB0112 sounds like it's directly about what's happening. The incentives for developers might actually help.

ASSISTANT: Great, so we'll focus on SB0112 for your message to Senator Park.

Now, how would you like to send this message? Would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct.

And based on how you've been talking, Jordan, I'll write this in your voice — casual, direct, and personal. Sound right?

USER: Email, definitely. And yeah, casual is perfect. Thanks!

ASSISTANT: Alright, Jordan, here’s a first draft of an email to Senator Park based on what you've shared:

Subject: Concerned Constituent - Provo Housing Crisis

Hi Senator Park,

I'm writing to you as one of your constituents in Provo about the really tough housing situation here. My rent has gone up 40% in just two years, and it feels like my neighbors and I are getting priced out of the city we love. It's incredibly stressful, and it makes me worry about whether I can even afford to stay in Provo long-term.

I saw that you sponsored SB0112, the Affordable Housing Development Incentives bill, in this year's General Session. I think giving developers incentives to include below-market-rate units is a really important step. We need solutions that actually help everyday people stay in their homes.

Thanks for your work on this, and I hope you'll keep pushing for more affordable housing solutions for Provo residents.

— Jordan

How does that look? Would you like any changes?

USER: It's good! Could you add that I've lived in Provo for 8 years? I think that shows I'm really invested in the community.

ASSISTANT:
