ASSISTANT: What's been on your mind lately — what brings you here today?

USER: Hey, yeah. I'm just really worried about housing here in Provo. My rent has gone up like 40% in two years, and it just feels like all my neighbors are getting priced out. I've lived here for 8 years and I love it, but I don't know if I can afford to stay.

ASSISTANT: Oh wow, Jordan, that sounds incredibly stressful. Facing a 40% rent increase and seeing your neighbors struggling to stay in a city you love for 8 years — that's not just a statistic, that's your home and your community feeling threatened. It's completely understandable why you'd be worried about that.

USER: Exactly! It's like, what are we supposed to do?

ASSISTANT: I hear you, Jordan. Let's see if we can get your concerns directly to your state legislator. To find your specific representatives, I'll need your address — just the street address and city or ZIP is fine.

USER: Sure, it's 847 N Freedom Blvd, Provo.

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

USER: Hmm, let's go with Senator Park.

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

ASSISTANT: Here are some bills Senator Park has sponsored that relate to housing affordability:

1.  **SB0112 — Affordable Housing Development Incentives** — This bill provides tax incentives to developers who include below-market-rate units in new residential projects in high-cost counties. It's currently in its 3rd reading in the Senate in this year's session.
2.  **SB0088 — Rental Assistance Fund Amendments** — This bill expanded eligibility criteria for the state emergency rental assistance fund. It was signed by the Governor after passing the 2025 General Session with a 24-4 vote.

Do either of these connect to what you're concerned about, or would you like me to search a different angle?

USER: Yeah, SB0112, the development incentives one, sounds like it's right on target with what's happening.

ASSISTANT: Great. So we'll focus your message around SB0112, the Affordable Housing Development Incentives bill.

Now, would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct.

USER: Email, please.

ASSISTANT: Perfect. And just to get the voice right, Jordan — based on how you've been talking, I'll write this in your voice: casual, direct, and personal. Does that sound right for your message?

USER: Yes, that's exactly what I'm going for.

ASSISTANT: Here's a first draft of your email to Senator Park, Jordan. Take a look and let me know what you think or if you'd like any changes:

Hi Senator Park,

I'm writing to you today as a constituent from Provo to share my serious concerns about housing affordability in our city. My rent has gone up 40% in just two years, and I'm seeing so many of my neighbors struggling and having to leave the community. It feels like the city is changing around us, and it's really worrying.

I'm specifically concerned about SB0112, the Affordable Housing Development Incentives bill, which is currently in its 3rd reading this session. I believe incentives for developers to include below-market-rate units are crucial for helping people like me and my neighbors stay in our homes.

Thank you for your time and for considering the impact of this legislation on your constituents.

— Jordan

ASSISTANT: How does that look? Any thoughts on changes or additions?

USER: It's good! Could you add in that I've lived in Provo for 8 years? I feel like that makes it more personal.

ASSISTANT: Great idea, Jordan. Adding that detail will definitely strengthen your message. Here's the revised draft:

Hi Senator Park,

I'm writing to you today as a constituent from Provo, where I've lived for 8 years, to share my serious concerns about housing affordability in our city. My rent has gone up 40% in just two years, and I'm seeing so many of my neighbors struggling and having to leave the community. It feels like the city is changing around us, and it's really worrying. I love Provo and I'm concerned I might not be able to afford to stay.

I'm specifically concerned about SB0112, the Affordable Housing Development Incentives bill, which is currently in its 3rd reading this session. I believe incentives for developers to include below-market-rate units are crucial for helping people like me and my neighbors stay in our homes.

Thank you for your time and for considering the impact of this legislation on your constituents.

— Jordan

ASSISTANT: How does this revised version feel, Jordan? Is it ready to send?

USER: Yes, that's perfect. Thank you so much!

ASSISTANT: You're very welcome, Jordan! I'm glad we could get this message ready for you. You can copy and paste this text directly into an email to Senator Park at dpark@le.utah.gov.
