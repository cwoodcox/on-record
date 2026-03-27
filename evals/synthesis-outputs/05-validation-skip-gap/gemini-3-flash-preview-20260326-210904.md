ASSISTANT: Hello! What has been on your mind lately? I'm here to help you share your concerns directly with your state legislators.

USER: I'm a third-generation farmer out here in Taylorsville, and the water rights situation is getting dire. I've got 80 acres and I've already had to cut one of my crop rotations this year because of the uncertainty around allocations. If next season looks like this one, I'm not sure how we'll keep the lights on.

ASSISTANT: I understand. To find your representatives and see what they're working on regarding water, I'll need your address—just the street and city or ZIP is fine. Also, I want to make sure this message feels personal; what is your name?

USER: My name is Tom. Address is 4455 S Redwood Rd, Taylorsville.

ASSISTANT [calls lookup_legislator: street="4455 S Redwood Rd", zone="Taylorsville"]: Looking up your representatives...
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

ASSISTANT: Got it, Tom. Based on your address in Taylorsville, your state representatives are:

- **Representative Jeffrey Hammond**, House District 33
- **Senator Steven Thorpe**, Senate District 4

Which one of them would you like to write to?

USER: Let's go with Senator Thorpe.

ASSISTANT [calls search_bills: legislatorId="THORST", theme="water rights"]: Searching for bills sponsored by Senator Thorpe regarding water rights...
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

ASSISTANT: I found a bill that Senator Thorpe has sponsored that relates to your situation:

1. **SB 0156 — Water Rights Modernization Act** — This bill updates the adjudication process for water rights and sets priority criteria for agricultural users during shortages. It is currently in a Senate committee for this year's General Session.

Does this bill connect to what you're concerned about, Tom, or would you like me to search for a different angle?

USER: That sounds exactly like what I'm talking about. The priority criteria for farmers is the main thing for me.

ASSISTANT: Excellent. I can help you draft a message to Senator Thorpe about that. Before I do, would you prefer to send this as an **email** or a **text/SMS**?

Also, you've been quite matter-of-fact and direct in our conversation—I'll match that professional tone in the draft. Does that work for you?

USER: Email is better. And yes, keep it professional and to the point.

ASSISTANT: Here is a draft of the email for you to review:

Subject: Priority criteria for agricultural water rights - SB 0156

Dear Senator Thorpe,

As a constituent and a third-generation farmer in Taylorsville, I am writing to share my perspective on the water allocation challenges facing our community. My family has farmed 80 acres here for decades, but the current uncertainty regarding water rights has already forced me to reduce my crop rotations.

I am specifically following SB 0156, the Water Rights Modernization Act, which you have sponsored in this year's General Session. The establishment of clear priority criteria for agricultural users during shortage periods is vital for the survival of operations like mine. Without more certainty in the adjudication process, the future of local farming remains at risk.

I appreciate your work on this legislation and hope you will continue to prioritize the needs of Utah's agricultural producers as this bill moves through committee.

Respectfully,

Tom

Does this look ready to send, or would you like to make any changes?

USER: It's good, but can you add a sentence about how losing that one crop rotation already hurt my bottom line this year? I want him to know it's not just a future problem.

ASSISTANT: Certainly, Tom. I've updated the draft to include that detail.

Subject: Priority criteria for agricultural water rights - SB 0156

Dear Senator Thorpe,

As a constituent and a third-generation farmer in Taylorsville, I am writing to share my perspective on the water allocation challenges facing our community. My family has farmed 80 acres here for decades, but the current uncertainty regarding water rights has already forced me to reduce my crop rotations. Losing that rotation has already had a direct negative impact on my bottom line this year, and it makes planning for next season nearly impossible.

I am specifically following SB 0156, the Water Rights Modernization Act, which you have sponsored in this year's General Session. The establishment of clear priority criteria for agricultural users during shortage periods is vital for the survival of operations like mine. Without more certainty in the adjudication process, the future of local farming remains at risk.

I appreciate your work on this legislation and hope you will continue to prioritize the needs of Utah's agricultural producers as this bill moves through committee.

Respectfully,

Tom

How does this version look to you?

USER: That's perfect. Thanks for the help.

ASSISTANT: You're very welcome, Tom. I'm glad we could get that drafted for you. You can now copy that text and send it to Senator Thorpe at sthorpe@le.utah.gov. Is there anything else I can help you with today?
