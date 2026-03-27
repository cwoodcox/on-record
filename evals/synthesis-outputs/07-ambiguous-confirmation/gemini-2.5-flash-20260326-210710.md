ASSISTANT: What's been on your mind lately — what brings you here today?

USER: Oh, hi! It's just... school funding. My kids go to elementary school here in Sandy, and I volunteer there a lot. I see firsthand how little they have compared to some of the schools across town. It's just not fair, you know?

ASSISTANT: That feeling of inequity, especially when it impacts your kids' education, sounds incredibly frustrating. It's tough when you see resources unevenly distributed like that, especially when you're there on the ground volunteering, Linda. I want to help you make your voice heard on this.

USER: Yes, Linda is my name. And it really is frustrating! My two kids, Sarah and Ben, deserve the same opportunities as kids in more affluent areas.

ASSISTANT: I totally get that, Linda. To help you connect with the right person, I'll need your address — just the street address and city or ZIP is fine. That way, I can find your specific representatives.

USER: Okay, it's 9241 S 300 E in Sandy.

ASSISTANT [calls lookup_legislator: street="9241 S 300 E", zone="Sandy"]: Looking up your address...
TOOL RESULT:
{
  "legislators": [
    {
      "id": "FOXROB",
      "chamber": "house",
      "district": 53,
      "name": "Robert Fox",
      "email": "rfox@le.utah.gov",
      "phone": "801-572-3348",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "HANSCA",
      "chamber": "senate",
      "district": 10,
      "name": "Carol Hansen",
      "email": "chansen@le.utah.gov",
      "phone": "801-568-9901",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "9241 S 300 E, SANDY"
}

ASSISTANT: Got it, Linda. Based on your address, your state representatives are:
- **Robert Fox**, House District 53
- **Carol Hansen**, Senate District 10

Which one would you like to write to about school funding?

USER: Hmm, I think the Senate one. Carol Hansen.

ASSISTANT [calls search_bills: legislatorId="HANSCA", theme="school funding equity"]: Searching for bills sponsored by Senator Hansen related to school funding equity...
TOOL RESULT:
{
  "bills": [
    {
      "id": "SB0445",
      "session": "2026GS",
      "title": "Public School Weighted Pupil Unit Amendments",
      "summary": "Revises the weighted pupil unit formula to direct more per-pupil funding to schools in lower-income areas.",
      "status": "Senate/ 2nd reading",
      "sponsorId": "HANSCA"
    },
    {
      "id": "SB0301",
      "session": "2025GS",
      "title": "Title I Supplemental Funding Coordination Act",
      "summary": "Requires school districts to report on how federal Title I funds are supplementing — not replacing — state base funding.",
      "status": "Governor/ signed",
      "sponsorId": "HANSCA",
      "voteResult": "22-6",
      "voteDate": "2025-03-11"
    }
  ],
  "legislatorId": "HANSCA",
  "session": "2026GS"
}

ASSISTANT: Okay, Linda, here are a couple of bills Senator Hansen has sponsored that relate to school funding:

1.  **SB0445 — Public School Weighted Pupil Unit Amendments** — This bill revises the funding formula to direct more money per student to schools in lower-income areas. It's currently in its second reading in the Senate for this year's session.
2.  **SB0301 — Title I Supplemental Funding Coordination Act** — This bill requires school districts to report on how federal Title I funds are used to ensure they add to, rather than replace, state funding. This one was signed into law last year.

Do any of these connect to what you're concerned about, or would you like me to search a different angle?

USER: I guess the first one sounds right? SB0445?

ASSISTANT: Just to make sure — are you comfortable building your message around SB0445, the Public School Weighted Pupil Unit Amendments bill? We want to make sure it's exactly what you want to communicate.

USER: Yes, that one! That's the one that talks about getting more money to schools like my kids'.

ASSISTANT: Great! Now, for getting your message to Senator Hansen, would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct.

USER: Definitely email. I have a lot to say.

ASSISTANT: And I want to get the voice right — would you like this to sound **casual and personal** (in your own words) or **more polished and professional**?

USER: Casual and personal, please. I want it to sound like me, not some formal letter.

ASSISTANT: Got it, Linda. Here's a first draft of an email to Senator Hansen, reflecting your concerns and referencing SB0445:

Subject: School Funding in Sandy - A Constituent's Concern

Hi Senator Hansen,

I'm writing to you as a concerned constituent from Sandy. My two kids, Sarah and Ben, go to elementary school here, and I see firsthand the huge difference in resources between our school and others in more affluent areas. It's really frustrating to watch, and it feels unfair when all kids deserve the same opportunities.

I'm particularly interested in SB0445, the Public School Weighted Pupil Unit Amendments, which is currently in its second reading this session. Revising the funding formula to direct more per-pupil funding to schools in lower-income areas like ours would make a real difference for my kids and their classmates.

Please consider supporting SB0445 and advocating for more equitable school funding. Our community needs these resources to give our children the education they deserve.

Thanks,
Linda

What do you think of this draft, Linda? Would you like any changes?
