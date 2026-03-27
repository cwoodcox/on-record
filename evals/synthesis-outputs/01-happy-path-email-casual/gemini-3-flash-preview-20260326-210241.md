ASSISTANT: What's been on your mind lately — what brings you here today?

USER: Honestly, I'm just really worried about housing. I've lived in Provo for about 8 years now, and like, my rent has gone up 40% in just the last two years. It's wild. I see my neighbors being priced out and moving away, and I'm scared I'm going to have to leave the city I love because I just can't keep up with these costs. It feels like everything is changing so fast and not in a good way for people like me who rent.

ASSISTANT: It sounds incredibly draining to feel like the place you’ve called home for nearly a decade is becoming out of reach. Seeing your community start to thin out because people can’t afford to stay — that's a heavy thing to carry, especially when it's your own housing security on the line. I want to make sure this message feels personal to your experience. What's your name?

USER: My name is Jordan. And yeah, "draining" is exactly the word for it.

ASSISTANT: I hear you, Jordan. Let's see what your representatives are doing about this. To find your specific representatives, I'll need your address — just the street address and city or ZIP is fine.

USER: I'm at 847 N Freedom Blvd in Provo.

ASSISTANT [calls lookup_legislator: street="847 N Freedom Blvd", zone="Provo"]: Looking up your legislators...
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

*   **Rep. Maria Chen**, House District 61
*   **Sen. David Park**, Senate District 16

Which one would you like to write to?

USER: Let's go with Senator Park.

ASSISTANT [calls search_bills: legislatorId="PARKDA", theme="housing affordability"]: Searching for bills sponsored by Senator Park...
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

1.  **SB 112 — Affordable Housing Development Incentives** — This bill provides tax incentives to developers who include below-market-rate units in new projects in high-cost counties. It is currently in its 3rd reading in the Senate.
2.  **SB 88 — Rental Assistance Fund Amendments** — This bill expanded eligibility for the state's emergency rental assistance fund. It passed in the 2025 General Session and was signed by the Governor.

Do either of these connect to what you're concerned about, Jordan, or would you like me to search a different angle?

USER: That SB 112 one sounds like what we need. We definitely need more units that regular people can actually afford. Let's use that.

ASSISTANT: Perfect, let's focus on SB 112. To get this ready, would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story, while text is very short and direct. 

Also, based on how we've been talking, I’ll write this in your voice — casual, direct, and personal. Does that sound right to you?

USER: Email is better, I think. And yeah, keep it casual. I want him to know I'm a real person, not like a lobbyist or something.

ASSISTANT: Here is a draft of the email for you to review:

Subject: Housing in Provo / SB 112

Hi Senator Park,

I’m writing to you as one of your constituents here in Provo. I’ve been living here for a while now and I really love this city, but I’m getting pretty worried about whether I’ll be able to stay. My rent has jumped up 40% in just the last two years, and I’m seeing my neighbors get priced out and move away one by one. It’s been really stressful trying to figure out how to keep up with these costs.

I was looking into what you've been working on, and I wanted to reach out and say I support SB 112, the Affordable Housing Development Incentives bill you sponsored this session. We desperately need more units that are actually affordable for people who live and work here, and giving developers a reason to include below-market-rate units feels like a step in the right direction. 

I hope you'll keep fighting for renters like me who are just trying to keep a roof over our heads in the community we love.

Thanks,
Jordan

Does that look good to you, or should we change anything?

USER: That's great, but can you make sure to mention that I've lived here for 8 years? I think it helps show that I'm not just someone passing through.

ASSISTANT: Absolutely. Here is the revised draft with that detail included:

Subject: Housing in Provo / SB 112

Hi Senator Park,

I’m writing to you as one of your constituents here in Provo. I’ve lived in this city for 8 years now and I really love it here, but lately, I’ve been getting pretty worried about whether I’ll be able to stay long-term. My rent has jumped up 40% in just the last two years, and it's been heartbreaking to see my neighbors get priced out and have to move away. It’s a lot of pressure trying to figure out how to stay afloat when costs are rising this fast.

I was looking into your work lately and wanted to let you know I support SB 112, the Affordable Housing Development Incentives bill you sponsored this session. As a renter, it means a lot to see legislation that encourages developers to include below-market-rate units in their projects. We really need more housing options that are within reach for regular people.

I hope you’ll keep pushing for solutions like this so that people like me who have been part of this community for years can afford to stay here.

Thanks,
Jordan

How does this version look to you?

USER: It looks perfect. Thank you!

ASSISTANT: You're very welcome, Jordan! I'm glad we could get that drafted for you. You can copy that text and send it to Senator Park at dpark@le.utah.gov. Is there anything else I can help you with today?
