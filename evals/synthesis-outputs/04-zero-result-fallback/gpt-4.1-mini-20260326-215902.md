ASSISTANT: Hi there! What's been on your mind lately — what brings you here today?

USER: I'm really worried about teen mental health. My daughter’s school counselor was cut in the middle of the year, and now she’s on a six-month waitlist to see a therapist. She’s 15 and has been struggling with anxiety all year with nowhere to turn.

ASSISTANT: That sounds incredibly tough, Sarah. Watching your daughter endure anxiety without timely support must feel overwhelming and exhausting. I want to make sure I understand everything clearly — has this affected your family in other ways too?

USER: Yeah, it’s been hard on all of us. It’s frustrating trying to find resources that just aren’t there.

ASSISTANT: I hear you, Sarah. I want to get this right for you. To find your specific representatives, I'll need your address — just the street address and city or ZIP is fine.

USER: 1822 Gentile St, Layton

ASSISTANT [calls lookup_legislator: street="1822 Gentile St", zone="Layton"]: Looking up your address...
TOOL RESULT:
{
  "legislators": [
    {
      "id": "OLSEKE",
      "chamber": "house",
      "district": 14,
      "name": "Kevin Olsen",
      "email": "kolsen@le.utah.gov",
      "phone": "801-544-7723",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "RIVETA",
      "chamber": "senate",
      "district": 20,
      "name": "Tanya Rivera",
      "email": "trivera@le.utah.gov",
      "phone": "801-510-6382",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "1822 GENTILE ST, LAYTON"
}

ASSISTANT: Got it. Based on your address, your state representatives are:
- Kevin Olsen, House District 14
- Tanya Rivera, Senate District 20

Which one would you like to write to?

USER: I'd like to write to Senator Rivera.

ASSISTANT [calls search_bills: legislatorId="RIVETA", theme="teen mental health"]: Searching for relevant bills...
TOOL RESULT:
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}

ASSISTANT: I searched for bills Senator Rivera has sponsored on teen mental health but didn’t find any. Would you like to try a different angle or describe your concern with other words?

USER: How about "youth counseling"?

ASSISTANT [calls search_bills: legislatorId="RIVETA", theme="youth counseling"]: Searching for relevant bills...
TOOL RESULT:
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}

ASSISTANT: I also checked for youth counseling but didn’t find any related bills sponsored by Senator Rivera. We can still write a message sharing your concern without referencing a specific bill. Would you like to proceed that way or keep searching?

USER: Let's just proceed without a bill.

ASSISTANT: Sounds good, Sarah. Would you prefer to send this as an email or a text/SMS? Email gives you more room to tell your story; text is short and direct.

USER: An email would be good.

ASSISTANT: Thanks! Based on how you’ve been talking, I’d write this in your voice — casual, direct, and personal. Does that work for you?

USER: Yes, that sounds right.

ASSISTANT: Great! I’ll prepare a draft email to Senator Rivera that shares your experience and concerns. Give me a moment.

ASSISTANT: Here’s a draft for you to review:

---

Hi Senator Rivera,

I’m writing as a constituent from Layton to share my concern about the lack of timely mental health support for teens in our community. My daughter, who is 15, has been struggling with anxiety all year, and her school counselor was cut midway through the year. She’s now on a six-month waitlist to see a therapist, which leaves her with very little help when she needs it most.

This situation has been really hard on our family, and I hope you can understand how important it is to have accessible mental health resources for youth.

Thanks for your time,  
Sarah

---

Would you like me to make any changes?

USER: Could you add that I’m a taxpayer and voter in Layton?

ASSISTANT: Certainly! Here's the revised draft including that detail:

---

Hi Senator Rivera,

I’m writing as a taxpayer, a voter, and a constituent from Layton to share my concern about the lack of timely mental health support for teens in our community. My daughter, who is 15, has been struggling with anxiety all year, and her school counselor was cut midway through the year. She’s now on a six-month waitlist to see a therapist, which leaves her with very little help when she needs it most.

This situation has been really hard on our family, and I hope you can understand how important it is to have accessible mental health resources for youth.

Thanks for your time,  
Sarah

---

Does this look good to send, or would you like any other changes?

USER: That looks perfect. Go ahead.
