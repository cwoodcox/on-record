# Test Runs 4.3 — Medium and Formality Selection

**Story:** 4.3 — Medium and Formality Selection
**Executor:** Corey
**Pass criterion:** At least 4 of 5 runs earn PASS on all applicable checklist items

---

## Run 1 — Persona A (Deb — email, conversational, single-message)

**Date:** 19 Mar
**Persona:** A — Deb
**Address used:** 1148 S 2095 W Lehi, UT
**Legislator selected:** Heidi Balderree
**Bill confirmed:** SB2 Public Education Budget Amendments

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [x] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [x] Chatbot captured BOTH email and conversational from single message without re-asking formality (AC 3)

**Step 4b — Draft Compliance**
- [x] Draft uses first-person, personal voice matching conversational selection (AC 5)
- [x] Draft is 2–4 paragraphs (count: 3) (AC 6)
- [x] Draft is 150–400 words (count/estimate: 250) (AC 6)
- [x] Draft has greeting line (AC 6)
- [x] Draft has closing signature (AC 6)

### Notes / Verbatim Fails

It conserved the conversational term which kinda made me chuckle

### Overall Result: PASS / FAIL

PASS
---

## Run 2 — Persona B (Marcus — text/SMS, formal, two-step)

**Date:** 19 Mar
**Persona:** B — Marcus
**Address used:** 682 E 770 N, Lindon
**Legislator selected:** David Shallenberger
**Bill confirmed:** HB404 Sex-Designated Housing Amendments

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [x] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [x] After "Text." only, chatbot asked for formality before generating draft (AC 4)
- [x] Chatbot used three-path formality logic correctly (AC 2)

**Step 4b — Draft Compliance**
- [x] Draft is structured and formal in register (AC 5)
- [x] Draft is 1–3 sentences total (count: ___) (AC 7)
- [x] Each segment is under 160 characters (AC 7)
- [x] No formal salutation (AC 7)

### Notes / Verbatim Fails


### Overall Result: PASS / FAIL

Pass

---

## Run 3 — Persona C (Alex — inferred conversational register)

**Date:** 20 Mar
**Persona:** C — Alex
**Address used:** 1500 North University Ave, Provo
**Legislator selected:** Kevin J. Stratton
**Bill confirmed:** _none_

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [x] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] Chatbot confirmed conversational rather than presenting full formality question (AC 2 — casual inference path)
- [ ] Chatbot used "It sounds like you'd want to keep this conversational…" phrasing or equivalent

**Step 4b — Draft Compliance**
- [x] Draft uses first-person, personal voice (AC 5)

### Notes / Verbatim Fails

casual inference _minor_ fail, it asked directly without even hinting that it thought it might be conversational. draft used a pretty formal "dear senator stratton," which isn't very informal.

*Note: If chatbot presented "conversational or formal?" instead of inferring, mark AC 2 as minor FAIL (over-asking). If chatbot inferred formal despite clearly casual language, mark AC 2 as serious FAIL.*

### Overall Result: PASS / FAIL

Fail

---

## Run 4 — Persona D (Fatima — inferred formal, email)

**Date:** 20 Mar
**Persona:** D — Fatima
**Address used:** 500 E 500 S, Salt Lake City
**Legislator selected:** Jen Plumb
**Bill confirmed:** _none_

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [x] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] Chatbot confirmed formal rather than presenting full formality question (AC 2 — formal inference path)
- [ ] Chatbot used "It sounds like you'd prefer a more formal tone…" phrasing or equivalent

**Step 4b — Draft Compliance**
- [x] Draft is structured and formal in register (AC 5)
- [x] Draft is 2–4 paragraphs (count: ___) (AC 6)
- [x] Draft is 150–400 words (count/estimate: ___) (AC 6)
- [x] Draft has greeting line (AC 6)
- [x] Draft has closing signature (AC 6)

### Notes / Verbatim Fails

Bot interpreted my behavior as "warm, personal, heartfelt" and thought I would like conversational rather than "stiff and formal".

*Note: If chatbot presented "conversational or formal?" instead of inferring, mark AC 2 as minor FAIL. If chatbot inferred conversational despite clearly formal language, mark AC 2 as serious FAIL.*

### Overall Result: PASS / FAIL

Fail
---

## Run 5 — Persona E (dual preference, ambiguous register)

**Date:** 20 Mar
**Persona:** E — Dual preference, ambiguous register
**Address used:** 1326 W Mason Hollow Dr, Riverton
**Legislator selected:** Dan McCay
**Bill confirmed:** _none_

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [x] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [x] Chatbot captured text/SMS medium from single message without re-asking medium (AC 3 — partial dual capture)
- [ ] Chatbot asked directly "conversational or formal?" because register was ambiguous (AC 2 — ambiguous path)
- [ ] Chatbot did NOT generate draft before formality was resolved (AC 2)

**Step 4b — Draft Compliance**
- [x] Draft is 1–3 sentences total (count: ___) (AC 7)
- [x] Each segment is under 160 characters (AC 7)
- [x] No formal salutation (AC 7)

### Notes / Verbatim Fails

> Your language throughout has been pretty direct and conversational — I'll match that.

I'm not sure I dislike that assumption, but it's a fail according to the criteria.

### Overall Result: PASS / FAIL

Fail

---

## Summary

| Run | Persona | Overall Result | Notes |
|-----|---------|---------------|-------|
| 1 | A — Deb (email, conversational) | PASS | Dual capture worked; conversational tone correct |
| 2 | B — Marcus (text, formal) | PASS | Two-step capture worked; formal SMS correct |
| 3 | C — Alex (inferred conversational) | FAIL | AC 2: asked directly instead of inferring casual register |
| 4 | D — Fatima (inferred formal) | FAIL | AC 2: inferred conversational — conflated warmth with casual register |
| 5 | E — Dual preference, ambiguous | FAIL | AC 2: inferred conversational instead of asking for ambiguous register |

**Story 4.3 Result:** 2 / 5 runs PASS → **[ ] PASS  [x] FAIL**

---

## agent-instructions.md Changes (if any)

*Fill in if any runs failed and required instruction updates.*

| Run # | AC Failed | Section in agent-instructions.md | Change Made | Re-run Result |
|-------|-----------|----------------------------------|-------------|---------------|
| | | | | |
