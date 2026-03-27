ASSISTANT: Hi there, I'm here to help you connect with your state legislator. What's been on your mind lately — what brings you here today?

USER: My daughter is really struggling with anxiety and it's been impossible to get her help. Her school counselor was cut mid-year and we've been on a waitlist for a therapist for six months. It's just awful to watch her go through this.

ASSISTANT: Oh Sarah, that sounds incredibly stressful and heartbreaking to watch your daughter struggle with anxiety and not be able to find the support she needs. Losing a school counselor mid-year and then facing a six-month wait for a therapist—that's not just a statistic, that's your 15-year-old daughter's daily life, and yours too. I want to help you make your voice heard on this.

USER: Yes, exactly. She's only 15 and it feels like the system is completely failing her.

ASSISTANT: It really sounds like it, Sarah. To find your specific representatives who can address concerns for your area, I'll need your address — just the street address and city or ZIP is fine.

USER: It's 1822 Gentile St in Layton.
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

ASSISTANT: Got it, Sarah. Based on your address, your state representatives are:
- **Kevin Olsen**, House District 14
- **Tanya Rivera**, Senate District 20

Which one would you like to write to about your daughter's situation?

USER: I'll go with Senator Rivera.
ASSISTANT [calls search_bills: legislatorId="RIVETA", theme="teen mental health"]: Searching for bills related to teen mental health...
TOOL RESULT:
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}

ASSISTANT: I searched for bills Senator Rivera has sponsored on "teen mental health," but I didn't find any directly matching bills on that specific topic. Would you like to try a related angle or describe your concern differently, Sarah? Perhaps something like "youth counseling" or "school mental health resources"?

USER: Hmm, yeah, let's try "youth counseling."
ASSISTANT [calls search_bills: legislatorId="RIVETA", theme="youth counseling"]: Searching for bills related to youth counseling...
TOOL RESULT:
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}

ASSISTANT: I'm sorry, Sarah, I tried searching for "youth counseling" but still didn't find any bills Senator Rivera has sponsored on that topic either.

Since we haven't found a directly matching bill, we can still write a message expressing your concern about your daughter's situation and the lack of mental health resources. Your concern is absolutely worth communicating, even without a specific bill reference. Would you like to do that, or keep searching with different words?

USER: Let's just go ahead and write the message. It's important for her to hear about it even if there isn't a bill.

ASSISTANT: Absolutely, Sarah. Your experience is powerful, and it deserves to be heard.

First, would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct.

Also, to get the voice right, I've heard you speak in a pretty casual and personal way throughout our conversation. Does it sound right if I draft this in that kind of voice — direct, personal, and in your own words? Or would you prefer something a bit more polished and professional?

USER: Email is best. And yes, keep it casual, definitely.

ASSISTANT: Great, Sarah. Here's a first draft for an email to Senator Rivera, reflecting your casual and personal voice, and sharing your daughter's experience:

Subject: Urgent — Mental Health Support Needed in Layton

Hi Senator Rivera,

I'm writing to you as a constituent from Layton about a really urgent issue impacting my family and our community: the lack of mental health support for teenagers. My 15-year-old daughter has been struggling with anxiety, and it's been incredibly frustrating and heartbreaking trying to get her the help she needs.

Her school counselor was cut mid-year, which really impacted the support system available to students. On top of that, we've been on a waitlist for a local therapist for six months now, with no end in sight. Watching her struggle without anywhere to turn is just awful.

I believe this highlights a critical gap in resources for our youth. We need better access to counseling and mental health services in schools and in the community. Our kids deserve better.

Thanks,
Sarah

How does that sound, Sarah? Would you like any changes or additions?

USER: That's a good start. Can you add that I'm also a taxpayer and a voter in her district? I think that's important for her to know.

ASSISTANT: Good point, Sarah. I can definitely add that. Here's a revised draft, including that you're a taxpayer and voter in her district:

Subject: Urgent — Mental Health Support Needed in Layton

Hi Senator Rivera,

I'm writing to you as a taxpayer and voter from Layton about a really urgent issue impacting my family and our community: the lack of mental health support for teenagers. My 15-year-old daughter has been struggling with anxiety, and it's been incredibly frustrating and heartbreaking trying to get her the help she needs.

Her school counselor was cut mid-year, which really impacted the support system available to students. On top of that, we've been on a waitlist for a local therapist for six months now, with no end in sight. Watching her struggle without anywhere to turn is just awful.

I believe this highlights a critical gap in resources for our youth. We need better access to counseling and mental health services in schools and in the community. Our kids deserve better.

Thanks,
Sarah

What do you think of this version, Sarah? Is it ready, or would you like any other adjustments?

USER: Perfect, that's exactly what I wanted. Thank you so much!

ASSISTANT: You're very welcome, Sarah. I'm glad we could get this drafted for you. I hope your message helps bring attention to this critical issue. Is there anything else I can help you with today?
