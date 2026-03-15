# Manual Test Run Log

**Pass criterion: 4 of 5 runs = Pass**
**Overall Pass/Fail definition:** "Pass" means the 4-step flow completed end-to-end (FR27) — warm open → address lookup → bill surfacing → draft generated → revision tested. Individual step check failures (e.g., Step 1 Validate ❌) are behavioral gaps tracked below; they do not fail the run unless the flow itself did not complete.
**Current: 5/5 complete, 5 Pass**

| Run | Persona | Model | Step Outcomes | Overall | Log |
|-----|---------|-------|---------------|---------|-----|
| 1 | A — Deb | Gemini 3 Flash Preview | Step A-1 Warm ✅<br>Step A-2 Concern ✅<br>Step A-3 Name ✅<br>Step A-4 Address ✅<br>Step A-5 Theme Inference ✅<br>Step A-6 Bill Presentation ✅<br>Step A-7 Confirmation ✅<br>Step A-8 Explicit Confirmation ✅| ✅ Pass | [conversation 1](../on-record-test/test%202/conversation%201.txt) |
| 2 | B — Marcus | Gemini 3 Flash Preview | Step B-1 Warm ✅<br>Step B-2 Concern ✅<br>Step B-3 Name ✅<br>Step B-4 Address ✅<br>Step B-5 Theme Inference ✅<br>Step B-6 Bill Presentation ✅<br>Step B-7 Confirmation ✅| ✅ Pass | [conversation 2](../on-record-test/test%202/conversation%202.txt) |
| 3 | C — Alex | Claude Sonnet 4.6 | Step C-1 Warm ✅<br>Step C-2 Concern ✅<br>Step C-3 Subject ✅<br>Step C-4 Address ✅<br>Step C-5 Presentation & Confirmation ✅| ✅ Pass | [conversation 3](../on-record-test/test%202/conversation%203.txt) |
| 4 | D — Fatima | Claude Sonnet 4.6 | Step D-1 Warm ✅<br>Step D-2 Concern ✅<br>Step D-3 Name ✅<br>Step D-4 Address ✅<br>Step D-5 Theme Inference ✅<br>Step D-6 Confirmation Gate ✅<br>Step D-7 Confirmation ⬜️| ✅ Pass | [conversation 4](../on-record-test/test%202/conversation%204.txt) |
| 5 | A — Deb | Claude Sonnet 4.6 |  Step E-1 Warm ✅<br>Step E-2 Concern ✅<br>Step E-3 Name ✅<br>Step E-4 Address ✅<br>Step E-5 Theme Inference ✅<br>Step E-6 Bill Presentation ✅<br>Step E-7 Confirmation ✅<br>Step E-8 Explicit Confirmation ✅| ✅ Pass | [conversation 5](../on-record-test/test%202/conversation%205.txt) |

### Run Notes

**Run 1:** How it threw in name solicitation felt awkward. Address confirmation was really good. It brought up a good point in explaining why we're looking up bills they've sponsored—to build common ground—perhaps a short note in the prompt about the reasons for this flow would be good.

**Run 2:** Redirecting topic to housing was good. It still didn't catch my hint about tone when I said "have a chat with cal" about this.

**Run 3:** I accidentally didn't feed the prompt to Claude the first time I did it, and it searched for the bill name with the tool nearly immediately, so the tool description probably needs refining to not do that. Also has me thinking we really need to support the ability to look up specific bills directly soon. Probably not MVP but it needs to be a priority. Claude loves the solicitation step, it did it three times before moving on to address. Didn't want me to cite the bill I brought unless it could find it, which is perfect, but it should be able to find it and confirm what it's about so we can write about it specifically. This was an AC 8 zero-result path.

**Run 4:** I did this one also once without the system prompt and it offered menus, but not with the prompt! Claude tried a few different topic searches to find a bill, then found one at my suggestion and actively dissuaded me from using it since it wasn't really connected to my situation! 👍🏻 I also said I'd like to use his work on it to show I'm paying attention, and it again said if I can find a quote or something from him myself to reference that would be good, but really didn't want me to reference an unrelated bill, which is also good. Really has me thinking we need to let them reference other legislators' bills in their texts to encourage support or opposition of specific legislation.

**Run 5:** Picked up and confirmed an address discrepancy before searching for legislators. I was intentionally vague about using the first bill, but it was an exact match for her concern, so Gemini reassured that it was a good choice, which is acceptable. 

> That makes sense, Deb. Since HB 497 is about stabilizing school budgets during funding shifts, it's a good one to reference when talking about the impact these cuts are having on your son's animation class.

---

## Overall Notes

