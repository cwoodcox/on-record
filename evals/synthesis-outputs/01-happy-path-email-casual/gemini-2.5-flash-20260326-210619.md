ASSISTANT: Hi there! What's been on your mind lately — what brings you here today?

USER: Hey. Yeah, it's just... housing, you know? My rent's gone up like 40% in two years, and I'm seeing so many of my neighbors just get priced out of Provo. It's really making me worried about staying here.

ASSISTANT: Oh, Jordan, that sounds incredibly stressful. Seeing your rent jump so much and your neighbors having to leave—that's not just a number on a lease, it's about your home and your community changing around you. That's a really tough situation to be in.

USER: Exactly. I've lived here for 8 years, and I love Provo, but I don't know how much longer I can afford to stay.

ASSISTANT: I hear you, and I want to help you make your voice heard on this, Jordan. To find your specific representatives, I'll need your address — just the street address and city or ZIP is fine.

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

ASSISTANT: Got it. Based on your address, Jordan, your state representatives are:
- **Maria Chen**, House District 61
- **David Park**, Senate District 16

Which one would you like to write to about housing affordability?

USER: Hmm, I think the Senate one, David Park.

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

1.  **SB 112 — Affordable Housing Development Incentives** — This bill provides tax incentives to developers who include below-market-rate units in new residential projects in high-cost counties. It's currently in its 3rd reading in the Senate in this year's session, so it's still active.
2.  **SB 88 — Rental Assistance Fund Amendments** — This bill expanded eligibility criteria for the state emergency rental assistance fund. It passed last year's General Session and was signed by the Governor.

Do either of these connect to what you're concerned about, or would you like me to search a different angle?

USER: SB 112, that first one, sounds really relevant. It feels like we need more affordable options.

ASSISTANT: Great. So, we'll focus your message around SB 112.

Now, to get this message ready, would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct.

USER: Email, definitely. I want to be able to explain more.

ASSISTANT: And Jordan, based on how you've been talking, I'll write this in your voice — casual, direct, and personal. Sound right?

USER: Yeah, that's perfect.

ASSISTANT: Okay, here's a first draft of your email to Senator Park, focusing on your concerns about housing affordability in Provo and connecting it to SB 112:

Hi Senator Park,

I'm writing to you today as a constituent from Provo because I'm really worried about housing affordability in our city. My rent has gone up by 40% in just two years, and I've seen so many of my neighbors forced to move out because they can't afford to live here anymore. It's tough to watch my community change like this, and I'm honestly concerned about how much longer I'll be able to stay in a city I love.

I saw that you sponsored SB 112, the Affordable Housing Development Incentives bill, which is currently in its 3rd reading. I really appreciate efforts to create more below-market-rate housing options. It feels like we desperately need more solutions to help stabilize rents and keep Provo a place where everyone can afford to live.

Thanks,
Jordan

How does that sound? Would you like any changes or additions?

USER: That's a good start! Could you add in that I've lived in Provo for 8 years? I think that helps show how much I care about this community.

ASSISTANT:
