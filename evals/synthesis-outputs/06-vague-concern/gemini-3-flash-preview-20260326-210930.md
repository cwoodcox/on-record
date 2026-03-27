ASSISTANT: What's been on your mind lately — what brings you here today?

USER: I don't know, something just feels off in my neighborhood lately. I've lived in West Valley City my whole life and it just feels different.

ASSISTANT: Living somewhere your whole life gives you a real sense for the rhythm of the place. When you say it feels "off," what are you seeing that's changed?

USER: It's the people. I'm seeing more folks visibly struggling on the street, and it feels like nobody's talking about it. A neighbor lost her son to an overdose last year—fentanyl. It's hitting close to home and it feels like we're being ignored.

ASSISTANT: That is heartbreaking. Seeing your community hurting like that—and losing a neighbor's son—makes that "off" feeling very real and very painful. I want to make sure we get this right and keep it personal; what's your name? And besides your neighbor, has this affected anyone else close to you directly?

USER: My name is Alex. It's mostly just seeing the community I love start to struggle like this. I feel protective of West Valley, you know? I'm just worried about where we're headed if we don't get more help for people.

ASSISTANT: I hear you, Alex. It’s clear how much you care about your home. To find out which representatives are responsible for your part of West Valley City so we can get them this message, I'll need your address—just the street and ZIP is fine.

USER: 2987 W 3500 S, West Valley City

ASSISTANT [calls lookup_legislator: street="2987 W 3500 S", zone="West Valley City"]: Looking up your representatives...
TOOL RESULT:
{
  "legislators": [
    {
      "id": "NGUYTH",
      "chamber": "house",
      "district": 40,
      "name": "Thomas Nguyen",
      "email": "tnguyen@le.utah.gov",
      "phone": "801-963-5517",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "GOMEMA",
      "chamber": "senate",
      "district": 7,
      "name": "Maria Gomez",
      "email": "mgomez@le.utah.gov",
      "phone": "385-344-7701",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "2987 W 3500 S, WEST VALLEY CITY"
}

ASSISTANT: Got it. Based on your address, your state representatives are:
- **Thomas Nguyen**, House District 40
- **Maria Gomez**, Senate District 7

Since you mentioned feeling protective of the local community, which one would you like to write to?

USER: Let's go with Rep. Nguyen. He seems more local.

ASSISTANT [calls search_bills: legislatorId="NGUYTH", theme="substance abuse prevention"]: Searching for related bills sponsored by Rep. Nguyen...
TOOL RESULT:
{
  "bills": [
    {
      "id": "HB0312",
      "session": "2026GS",
      "title": "Substance Abuse Prevention and Treatment Fund Amendments",
      "summary": "Increases appropriations to the Substance Abuse Prevention and Treatment Fund and expands grant eligibility to community-based recovery programs.",
      "status": "House/ passed",
      "sponsorId": "NGUYTH",
      "voteResult": "56-19",
      "voteDate": "2026-02-27"
    }
  ],
  "legislatorId": "NGUYTH",
  "session": "2026GS"
}

ASSISTANT: I found a bill Rep. Nguyen sponsored this year that's very relevant to what you're seeing:

**HB 312 — Substance Abuse Prevention and Treatment Fund Amendments.** This bill increases funding for the state's treatment fund and makes it easier for community-based recovery programs to get grants. It passed the House 56-19 back in February.

Does that sound like the right bill to mention in your message, Alex, or should I try searching for something else?

USER: Yeah, that's exactly it. We need more of that help on the ground.

ASSISTANT: Perfect. Before I put the draft together, how would you like to send this? I can set it up as an **email** or a **text/SMS**. 

Also, you've been speaking pretty straight from the heart—should I keep the draft **casual and personal**, or would you prefer it to be **more formal**?

USER: Email is better. And keep it casual—I want him to know it's coming from a real person who lives here.

ASSISTANT: Here is a draft of that email for you:

***

Subject: Thinking about our neighborhood in West Valley

Hi Representative Nguyen,

I’m writing to you as a lifelong resident of West Valley City. I love this community and I’ve always felt protective of it, but lately, things have started to feel "off." I’m seeing more and more of my neighbors visibly struggling on the street, and it feels like the substance abuse crisis is hitting us harder than ever. 

It's hard to watch people I care about go through this, and I wanted to reach out because I’m worried about where we’re headed if we don’t get more help directly to the people who need it. 

I saw that you sponsored HB 312, the Substance Abuse Prevention and Treatment Fund Amendments, which passed the House earlier this year. I'm really glad to see you're pushing for more funding for community-based recovery programs. We really need those resources on the ground here in West Valley. Please keep fighting for these kinds of solutions—it matters a lot to those of us seeing the impact every day.

Thanks, 
Alex

***

How does that look to you? I can change anything you'd like.

USER: It looks good, but can we add in the part about my neighbor's son? That's the main reason I'm so worried.

ASSISTANT: Of course, that makes it much more powerful. Here is the revised draft:

***

Subject: Thinking about our neighborhood in West Valley

Hi Representative Nguyen,

I’m writing to you as a lifelong resident of West Valley City. I love this community and I’ve always felt protective of it, but lately, things have started to feel "off." I’m seeing more and more of my neighbors visibly struggling on the street, and it feels like the substance abuse crisis is hitting us harder than ever. 

This isn't just something I'm seeing from a distance. Just last year, a neighbor of mine lost her son to a fentanyl overdose. Seeing a family here go through that kind of tragedy is heartbreaking, and it makes me really worried about where we’re headed if we don’t get more help directly to our streets.

I saw that you sponsored HB 312, the Substance Abuse Prevention and Treatment Fund Amendments, which passed the House earlier this year (56-19). I'm really glad to see you're pushing for more funding for community-based recovery programs. We really need those resources on the ground here in West Valley so other families don't have to go through what my neighbor did. Please keep fighting for these kinds of solutions.

Thanks, 
Alex

***

Does this version feel right to you now?

USER: Perfect. Let's send it.

ASSISTANT: I'm glad we got it right, Alex. You can copy that text into your email app and send it to Representative Nguyen at **tnguyen@le.utah.gov**. It’s a powerful message, especially with your personal connection to the neighborhood. Is there anything else I can help you with today?
