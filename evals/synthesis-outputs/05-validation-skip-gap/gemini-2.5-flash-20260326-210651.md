ASSISTANT: What's been on your mind lately — what brings you here today?

USER: I'm concerned about water rights for farmers. It's getting serious here in Taylorsville. I'm a third-generation farmer with 80 acres, and I've already had to reduce one of my crop rotations because of the uncertainty around water allocations for next season. It's really impacting my livelihood.

ASSISTANT: I understand. To find your specific representatives, I'll need your address — just the street address and city or ZIP is fine.

USER: It's 4455 S Redwood Rd, Taylorsville.

ASSISTANT [calls lookup_legislator: street="4455 S Redwood Rd", zone="Taylorsville"]: Looking up your address...
TOOL RESULT:
{
  "legislators": [
    {
      "id": "HAMMJE",
      "chamber": "house",
      "district": 33,
      "name": "Jeffrey Hammond",
      "email": "jhammond@le.utah.gov",
      "phone": "801-265-4409",
      "phoneLabel": "cell",
      "session": "2026GS"
    },
    {
      "id": "THORST",
      "chamber": "senate",
      "district": 4,
      "name": "Steven Thorpe",
      "email": "sthorpe@le.utah.gov",
      "phone": "801-263-8812",
      "phoneLabel": "cell",
      "session": "2026GS"
    }
  ],
  "session": "2026GS",
  "resolvedAddress": "4455 S REDWOOD RD, TAYLORSVILLE"
}

ASSISTANT: Got it. Based on your address, the resolved address is 4455 S Redwood Rd, Taylorsville. That looks correct.

Your state representatives are:
- **Jeffrey Hammond**, House District 33
- **Steven Thorpe**, Senate District 4

Which one would you like to write to, and what should I call you as we work on this?

USER: Senator Thorpe, please. And my name is Tom.

ASSISTANT [calls search_bills: legislatorId="THORST", theme="water rights"]: Searching for bills Senator Thorpe has sponsored related to water rights for you, Tom.
TOOL RESULT:
{
  "bills": [
    {
      "id": "SB0156",
      "session": "2026GS",
      "title": "Water Rights Modernization Act",
      "summary": "Updates the state's water rights adjudication process and establishes priority criteria for agricultural users during shortage periods.",
      "status": "Senate/ committee",
      "sponsorId": "THORST"
    }
  ],
  "legislatorId": "THORST",
  "session": "2026GS"
}

ASSISTANT: Tom, I found one bill Senator Thorpe has sponsored that relates to what you're describing:

1.  **SB 156 — Water Rights Modernization Act** — This bill updates the state's water rights adjudication process and establishes priority criteria for agricultural users during shortage periods. It is currently in a Senate committee for the 2026 General Session.

Does this bill connect to your concern, or would you like me to search for something else?

USER: Yes, that's exactly what I'm talking about. SB 156. We need those priority criteria.

ASSISTANT: Great. Now, let's think about how you'd like to send this message. Would you prefer to send this as an **email** or a **text/SMS**? Email gives you more room to tell your story; text is short and direct.

Also, I want to get the voice right for you. You've been pretty direct and matter-of-fact. I'll match that in the draft, keeping it professional and to the point. Does that sound right for your message?

USER: Email is best, and yes, professional and direct is exactly what I want.

ASSISTANT: Okay, Tom, here's a draft email based on your concerns about water rights and SB 156, in a professional and direct tone.

Subject: Urgent Concern Regarding Water Rights and SB 156

Dear Senator Thorpe,

I am writing to you today as a constituent from Taylorsville with significant concerns regarding the future of water rights in our state, particularly as they impact agricultural producers like myself. I am a third-generation farmer operating 80 acres, and the current uncertainty surrounding water allocations for the upcoming season has already forced me to reduce one of my essential crop rotations. This directly threatens my family's livelihood and the viability of our farm.

I understand that you have sponsored SB 156, the "Water Rights Modernization Act," in this year's General Session. I believe that establishing clear priority criteria for agricultural users during shortage periods, as this bill proposes, is critically important. Modernizing the adjudication process will provide much-needed stability and foresight for farmers who depend on reliable water access.

I urge you to continue championing SB 156 and to work towards its swift passage. Your efforts to secure our state's water future, especially for its agricultural backbone, are deeply appreciated.

Sincerely,

Tom

How does this look, Tom? Would you like any changes or additions?

USER: That's a strong start. Could you add something about how vital farming is to the local economy, not just my family? And also mention that our farm has been here for generations, making us deeply rooted in the community.

ASSISTANT: Absolutely, Tom. I'll revise the draft to include those points about the local economy and your family's generational ties.

Subject: Urgent Concern Regarding Water Rights and SB 156

Dear Senator Thorpe,

I am writing to you today as a constituent from Taylorsville with significant concerns regarding the future of water rights in our state, particularly as they impact agricultural producers like myself. Our 80-acre farm has been a cornerstone of this community for three generations, and the current uncertainty surrounding water allocations for the upcoming season has already forced me to reduce one of my essential crop rotations. This directly threatens my family's livelihood and the viability of our farm, which also contributes to our local economy.

I understand that you have sponsored SB 156, the "Water Rights Modernization Act," in this year's General Session. I believe that establishing clear priority criteria for agricultural users during shortage periods, as this bill proposes, is critically important. Modernizing the adjudication process will provide much-needed stability and foresight for farmers who depend on reliable water access to sustain both their operations and the broader economic health of our region.

I urge you to continue championing SB 156 and to work towards its swift passage. Your efforts to secure our state's water future, especially for its agricultural backbone and the families deeply rooted in its communities, are deeply appreciated.

Sincerely,

Tom

How does this revised draft look, Tom? Is this ready to send, or would you like any further adjustments?

USER: That's perfect, thank you. Ready to send.

ASSISTANT: You're very welcome, Tom. Your message to Senator Thorpe is now complete and ready for you to send. Let me know if you need assistance with anything else.
