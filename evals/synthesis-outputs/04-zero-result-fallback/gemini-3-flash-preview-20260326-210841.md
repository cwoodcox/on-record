ASSISTANT: What's been on your mind lately — what brings you here today?

USER: It's about my daughter. She's 15 and has been struggling with a lot of anxiety this year. Our school counselor was cut mid-year because of some budget thing, and we've been on a waitlist for a private therapist for six months now. There's just nowhere to turn for help around here.

ASSISTANT: Sarah, watching your daughter struggle with anxiety while being stuck on a six-month waitlist sounds incredibly draining. It's one thing to hear about budget cuts, but it's another entirely when it means the one person at school who could help her is suddenly gone. I want to make sure this message feels personal — what should I call you?

USER: My name is Sarah. And yeah, it’s just exhausting. You feel like you’re failing her because the system is so backed up.

ASSISTANT: I hear you, Sarah. It’s hard to feel like you're doing everything right for your kid but the support just isn't there. To get started on a message to your representatives about this, I'll need your address — just the street and city or ZIP is fine.

USER: I'm at 1822 Gentile St in Layton.

ASSISTANT [calls lookup_legislator: street="1822 Gentile St", zone="Layton"]: Looking up your representatives...
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

ASSISTANT: Got it. Based on your address in Layton, your state representatives are:
- **Rep. Kevin Olsen**, House District 14
- **Sen. Tanya Rivera**, Senate District 20

Which one would you like to write to, Sarah?

USER: Let's go with Senator Rivera.

ASSISTANT [calls search_bills: legislatorId="RIVETA", theme="teen mental health"]: Searching for bills sponsored by Sen. Rivera related to teen mental health...
TOOL RESULT:
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}

ASSISTANT: I searched for teen mental health, but I didn't find any bills Senator Rivera has sponsored on that topic. Would you like to try a related angle, or should I search for something else?

USER: Maybe try "youth counseling"? Since that's what we're actually missing right now.

ASSISTANT [calls search_bills: legislatorId="RIVETA", theme="youth counseling"]: Searching for bills sponsored by Sen. Rivera related to youth counseling...
TOOL RESULT:
{
  "bills": [],
  "legislatorId": "RIVETA",
  "session": "2026GS"
}

ASSISTANT: I wasn't able to find a directly matching bill for youth counseling either. We can still write a message expressing your concern, Sarah — it just won't reference a specific sponsored bill. Your situation with your daughter and the lack of resources in Layton is still very much worth communicating to her. Would you like to do that, or keep searching?

USER: No, let's just write the message. She needs to know what's happening.

ASSISTANT: I agree. Let's get that draft started. Would you prefer to send this as an **email** or a **text/SMS**? Email gives you a bit more room to share your daughter's story.

USER: An email is better.

ASSISTANT: And for the voice — you’ve been sharing this in a very personal, direct way. I can match that casual and sincere tone in the draft. Does that sound right to you?

USER: Yes, keep it personal.

ASSISTANT: Here is a draft for you to review:

Subject: Teen mental health resources in Layton

Hi Senator Rivera,

I’m writing to you as one of your constituents in Layton because I’m deeply concerned about the lack of mental health resources for our teens. My 15-year-old daughter has been struggling with anxiety all year, and it has been incredibly hard on our family. 

To make matters worse, her school counselor was cut mid-year due to budget changes, and we have been on a waitlist for a private therapist for six months now. It feels like there is nowhere to turn for help, and I know we aren't the only family in this position. 

I’m sharing this because I want you to understand how these funding and resource gaps affect real families in your district. We need better support for our kids’ mental health so they don't have to wait half a year for the help they need.

Thanks,
Sarah

How does this look to you? I can make any changes you’d like.

USER: It looks good, but can you add somewhere that I'm a taxpayer and a regular voter? I want her to know I'm paying attention.

ASSISTANT: Absolutely. Here is the revised draft:

Subject: Teen mental health resources in Layton

Hi Senator Rivera,

I’m writing to you as a taxpayer, a regular voter, and one of your constituents in Layton. I’m deeply concerned about the lack of mental health resources for our teens, something I've experienced firsthand with my daughter.

She is 15 and has been struggling with anxiety all year. When her school counselor was cut mid-year due to budget changes, we lost our only immediate support. We have now been on a waitlist for a private therapist for six months. It’s exhausting to feel like the system is failing our children when they need help the most.

I’m sharing this because I want you to understand how these resource gaps affect real families in your district. We need better support for our kids’ mental health so they don't have to wait half a year for the help they need. I'll be watching closely to see how the state addresses this.

Thanks,
Sarah

Does this version feel ready to send?
