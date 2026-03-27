ASSISTANT: What's been on your mind lately — what brings you here today?

USER: Honestly, just the cost of living here. My rent has gone up like 40% in just two years and it's getting impossible. I’m seeing my neighbors pack up and leave because they can't afford Provo anymore, and it feels like the whole city is changing for the worse.

ASSISTANT: That sounds incredibly draining, Jordan. Seeing your community change like that because people are being priced out of their homes—it’s not just about the money, it’s about losing the people who make the neighborhood feel like home. I want to make sure this feels personal, so what's your name? Also, has this situation started to affect your own plans for staying in the area?

USER: My name's Jordan. And yeah, it’s definitely affecting me. I rent an apartment and I’m honestly worried I’m going to have to leave the city I love. I've lived here for a while and I don't want to go, but the math just isn't adding up anymore.

ASSISTANT: I hear you, Jordan. It’s a lot of pressure to feel like you might be forced out of your own home. Let’s see if we can get your concerns in front of the people who can actually do something about it. To find your specific representatives, I'll need your address — just the street address and city or ZIP is fine.

USER: Sure, I'm at 847 N Freedom Blvd in Provo. 

ASSISTANT [calls lookup_legislator: street="847 N Freedom Blvd", zone="Provo"]: Looking up your representatives...
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

ASSISTANT: Got it, Jordan. Based on your address in Provo, your state representatives are:
- **Rep. Maria Chen**, House District 61
- **Sen. David Park**, Senate District 16

Which one would you like to write to?

USER: Let's go with Senator Park. 

ASSISTANT [calls search_bills: legislatorId="PARKDA", theme="housing affordability"]: Searching for housing bills sponsored by Senator Park...
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

ASSISTANT: Here are some bills Senator Park has sponsored that relate to what you're describing:

1. **SB 112 — Affordable Housing Development Incentives** — This bill provides tax incentives to developers who include below-market-rate units in new residential projects. It's currently in its 3rd reading in the Senate.
2. **SB 88 — Rental Assistance Fund Amendments** — This bill expanded eligibility for the state emergency rental assistance fund. It passed in the 2025 General Session.

Do either of these connect to what you're concerned about, Jordan, or would you like me to search a different angle?

USER: SB 112 sounds like exactly what we need right now. We need more units that regular people can actually afford.

ASSISTANT: I agree that focus on below-market-rate units hits right at what you were talking about. Before I put the draft together, would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story, while text is short and direct.

Also, based on how we've been talking, I’ll write this in your voice — casual, direct, and personal. Does that sound right to you?

USER: Email is better, I have a lot to say. And yeah, keep it casual. I want him to know it’s coming from a real person.

ASSISTANT: Here is a draft of the email for Senator Park:

Subject: Housing affordability in Provo

Hi Senator Park,

I’m writing to you as one of your constituents here in Provo. I’ve been living in my apartment for a while now, but lately, I’ve been getting really worried about whether I can actually stay here. My rent has gone up 40% in just two years, and it feels like everyone around me is being priced out of the city. It’s pretty heartbreaking to watch my neighbors leave because the math just doesn't work for them anymore.

I saw that you’re sponsoring SB 112, the Affordable Housing Development Incentives bill, in this year's General Session. I really support the idea of giving incentives to developers to include units that regular people can actually afford. We need more options like that so people like me aren't forced to leave the community we love.

I hope you'll keep pushing for this. Thanks for your time and for looking out for us.

Thanks, 
Jordan

How does that look to you? I can change anything you'd like.

USER: That's great, but can you add that I've lived here in Provo for 8 years? I want him to know I'm not just someone who moved here last month.

ASSISTANT: Of course. I've updated the draft to emphasize your deep roots in Provo.

Subject: Housing affordability in Provo

Hi Senator Park,

I’m writing to you as one of your constituents here in Provo. I’ve lived here for 8 years now and I really love this city, but lately, I’ve been getting worried about whether I’ll be able to stay. My rent has jumped up 40% in just the last two years, and it’s getting to the point where it’s almost impossible to keep up. I’m seeing my neighbors pack up and leave because they’re being priced out, and it feels like the community is disappearing.

I was really glad to see you sponsoring SB 112, the Affordable Housing Development Incentives bill, during this year's session. Getting developers to include units at below-market rates is exactly the kind of thing we need to make sure long-time residents like me don't get forced out.

I appreciate you working on this issue. I hope you'll keep fighting to make housing more affordable for everyone in our district.

Thanks,
Jordan

Does this version look ready to go, or is there anything else you'd like to adjust?

USER: That's perfect. Thanks for the help!

ASSISTANT: You're very welcome, Jordan! I'm glad I could help you get your story down. Your voice as a long-time Provo resident is really important for Senator Park to hear. Is there anything else I can help you with today?
