ASSISTANT: What's been on your mind lately — what brings you here today?

USER: I’m really worried about the Great Salt Lake. I’ve lived in Bountiful my whole life and I’ve watched it shrink every year. Now I’m reading about the ecological collapse risk and it’s actually scary. I have two teenage kids and I honestly don't know if this region will even be livable for them in twenty years if we don't fix the water situation.

ASSISTANT: That sense of risk isn't just an abstract headline when you're thinking about your kids' future and whether they'll be able to stay in the place you've always called home. It sounds like a heavy weight to carry. I want to make sure this message feels personal to you—what's your name?

USER: I'm Rachel.

ASSISTANT: It's good to meet you, Rachel. I hear how much is at stake for your family. To find your specific representatives so we can voice these concerns, I'll need your address—just the street address and city or ZIP is fine.

USER: 1143 N Main St, Bountiful.

ASSISTANT [calls lookup_legislator: street="1143 N Main St", zone="Bountiful"]: Looking up your representatives...
TOOL RESULT:
{
  "legislators": [
    {
      "id": "DRAKMA",
      "chamber": "house",
      "district": 20,
      "name": "Margaret Drake",
      "email": "mdrake@le.utah.gov",
      "phone": "801-295-4471",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "CROSSB",
      "chamber": "senate",
      "district": 22,
      "name": "Brian Cross",
      "email": "bcross@le.utah.gov",
      "phone": "801-298-9023",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "1143 N MAIN ST, BOUNTIFUL"
}

ASSISTANT: Got it. Based on your address in Bountiful, your state representatives are:
- **Rep. Margaret Drake**, House District 20
- **Sen. Brian Cross**, Senate District 22

Which one would you like to write to, Rachel?

USER: Let's go with Senator Cross.

ASSISTANT [calls search_bills: legislatorId="CROSSB", theme="Great Salt Lake water"]: Searching for bills sponsored by Senator Cross...
TOOL RESULT:
{
  "bills": [
    {
      "id": "SB0201",
      "session": "2026GS",
      "title": "Great Salt Lake Water Allocation Amendments",
      "summary": "Establishes minimum inflow targets for the Great Salt Lake and creates a state fund to compensate agricultural water rights holders who voluntarily reduce diversions.",
      "status": "Senate/ passed",
      "sponsorId": "CROSSB",
      "voteResult": "21-7",
      "voteDate": "2026-02-11"
    }
  ],
  "legislatorId": "CROSSB",
  "session": "2026GS"
}

ASSISTANT: Here is a bill Senator Cross has sponsored that relates to the water concerns you shared:

**SB 0201 — Great Salt Lake Water Allocation Amendments**
This bill establishes minimum inflow targets for the lake and creates a state fund to pay agricultural water users who voluntarily choose to use less water. It passed the Senate with a 21-7 vote on February 11th.

Does this bill connect to what you're concerned about, Rachel, or would you like me to search for something else?

USER: Yes, that’s exactly it. We need those inflow targets to be real.

ASSISTANT: It's a critical piece of the puzzle. Before I draft the message for you, I have two quick questions: 

Would you prefer to send this as an **email** or a **text/SMS**? Also, I want to get the voice right—you've been very articulate but also very direct. Would you like the message to be **casual and personal** or **more polished and professional**?

USER: Send it as an email. Keep it personal and direct, please.

ASSISTANT: Here is a draft of the email to Senator Cross:

Subject: Securing the future of the Great Salt Lake

Dear Senator Cross,

As a constituent from Bountiful, I am writing to you because I am deeply concerned about the future of the Great Salt Lake. I have two teenage children, and frankly, I am scared that this region won't be livable for them in twenty years if we don't take drastic action on our water situation now.

I am encouraged by your work on SB 0201, the Great Salt Lake Water Allocation Amendments, which passed the Senate 21-7 earlier this session. Establishing minimum inflow targets is essential for the lake's survival and for the health of our community. I appreciate you taking the lead on this and hope to see these targets strictly enforced to prevent ecological collapse.

Thank you for representing our district’s future.

Best,

Rachel [Last Name]

How does this look to you, Rachel? I can make any changes you’d like.

USER: It's good, but could you add that I grew up here in Bountiful? I remember how much bigger the lake used to be when I was a kid and I want him to know this isn't just a new concern for me.

ASSISTANT: That’s a powerful detail to include—it shows this is a lifelong observation for you. Here is the revised draft:

Subject: Securing the future of the Great Salt Lake

Dear Senator Cross,

As a lifelong resident of Bountiful, I am writing to you because I am deeply concerned about the future of the Great Salt Lake. I grew up near the lake and remember how much larger it was when I was a child. Seeing it shrink year after year is heartbreaking, and now that I have two teenage children of my own, I am genuinely scared for their future here.

I am encouraged by your work on SB 0201, the Great Salt Lake Water Allocation Amendments, which passed the Senate 21-7 earlier this session. Establishing minimum inflow targets is essential for the lake's survival and for the health of our community. I appreciate you taking the lead on this and hope to see these targets strictly enforced to ensure my kids can have a future in Utah.

Thank you for representing our district’s future.

Best,

Rachel [Last Name]

Does this version feel right to you?

USER: Yes, that's perfect. Thank you.

ASSISTANT: You're very welcome, Rachel. I'm glad we could get your story and your concerns into a message for Senator Cross. It’s ready for you to send!
