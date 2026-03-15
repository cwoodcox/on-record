# Test Runs 4.3 — Medium and Formality Selection

**Story:** 4.3 — Medium and Formality Selection
**Executor:** Corey
**Pass criterion:** At least 4 of 5 runs earn PASS on all applicable checklist items

---

## Run 1 — Persona A (Deb — email, conversational, single-message)

**Date:**
**Persona:** A — Deb
**Address used:** 742 Evergreen Terrace, Salt Lake City
**Legislator selected:**
**Bill confirmed:**

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [ ] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] Chatbot captured BOTH email and conversational from single message without re-asking formality (AC 3)

**Step 4b — Draft Compliance**
- [ ] Draft uses first-person, personal voice matching conversational selection (AC 5)
- [ ] Draft is 2–4 paragraphs (count: ___) (AC 6)
- [ ] Draft is 150–400 words (count/estimate: ___) (AC 6)
- [ ] Draft has greeting line (AC 6)
- [ ] Draft has closing signature (AC 6)

### Notes / Verbatim Fails


### Overall Result: PASS / FAIL

---

## Run 2 — Persona B (Marcus — text/SMS, formal, two-step)

**Date:**
**Persona:** B — Marcus
**Address used:** 8 Spruce Street, Provo
**Legislator selected:**
**Bill confirmed:**

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [ ] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] After "Text." only, chatbot asked for formality before generating draft (AC 4)
- [ ] Chatbot used three-path formality logic correctly (AC 2)

**Step 4b — Draft Compliance**
- [ ] Draft is structured and formal in register (AC 5)
- [ ] Draft is 1–3 sentences total (count: ___) (AC 7)
- [ ] Each segment is under 160 characters (AC 7)
- [ ] No formal salutation (AC 7)

### Notes / Verbatim Fails


### Overall Result: PASS / FAIL

---

## Run 3 — Persona C (Alex — inferred conversational register)

**Date:**
**Persona:** C — Alex
**Address used:** 1500 North University Ave, Provo
**Legislator selected:**
**Bill confirmed:**

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [ ] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] Chatbot confirmed conversational rather than presenting full formality question (AC 2 — casual inference path)
- [ ] Chatbot used "It sounds like you'd want to keep this conversational…" phrasing or equivalent

**Step 4b — Draft Compliance**
- [ ] Draft uses first-person, personal voice (AC 5)

### Notes / Verbatim Fails

*Note: If chatbot presented "conversational or formal?" instead of inferring, mark AC 2 as minor FAIL (over-asking). If chatbot inferred formal despite clearly casual language, mark AC 2 as serious FAIL.*

### Overall Result: PASS / FAIL

---

## Run 4 — Persona D (Fatima — inferred formal, email)

**Date:**
**Persona:** D — Fatima
**Address used:** 500 E 500 S, Salt Lake City
**Legislator selected:**
**Bill confirmed:**

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [ ] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] Chatbot confirmed formal rather than presenting full formality question (AC 2 — formal inference path)
- [ ] Chatbot used "It sounds like you'd prefer a more formal tone…" phrasing or equivalent

**Step 4b — Draft Compliance**
- [ ] Draft is structured and formal in register (AC 5)
- [ ] Draft is 2–4 paragraphs (count: ___) (AC 6)
- [ ] Draft is 150–400 words (count/estimate: ___) (AC 6)
- [ ] Draft has greeting line (AC 6)
- [ ] Draft has closing signature (AC 6)

### Notes / Verbatim Fails

*Note: If chatbot presented "conversational or formal?" instead of inferring, mark AC 2 as minor FAIL. If chatbot inferred conversational despite clearly formal language, mark AC 2 as serious FAIL.*

### Overall Result: PASS / FAIL

---

## Run 5 — Persona E (dual preference, ambiguous register)

**Date:**
**Persona:** E — Dual preference, ambiguous register
**Address used:**
**Legislator selected:**
**Bill confirmed:**

### Behavioral Checklist

**Step 4a — Delivery Preferences**
- [ ] Medium question appeared AFTER Step 3 bill confirmation (AC 1)
- [ ] Chatbot captured text/SMS medium from single message without re-asking medium (AC 3 — partial dual capture)
- [ ] Chatbot asked directly "conversational or formal?" because register was ambiguous (AC 2 — ambiguous path)
- [ ] Chatbot did NOT generate draft before formality was resolved (AC 2)

**Step 4b — Draft Compliance**
- [ ] Draft is 1–3 sentences total (count: ___) (AC 7)
- [ ] Each segment is under 160 characters (AC 7)
- [ ] No formal salutation (AC 7)

### Notes / Verbatim Fails


### Overall Result: PASS / FAIL

---

## Summary

| Run | Persona | Overall Result | Notes |
|-----|---------|---------------|-------|
| 1 | A — Deb (email, conversational) | | |
| 2 | B — Marcus (text, formal) | | |
| 3 | C — Alex (inferred conversational) | | |
| 4 | D — Fatima (inferred formal) | | |
| 5 | E — Dual preference, ambiguous | | |

**Story 4.3 Result:** ___ / 5 runs PASS → **[ ] PASS  [ ] FAIL**

---

## agent-instructions.md Changes (if any)

*Fill in if any runs failed and required instruction updates.*

| Run # | AC Failed | Section in agent-instructions.md | Change Made | Re-run Result |
|-------|-----------|----------------------------------|-------------|---------------|
| | | | | |
