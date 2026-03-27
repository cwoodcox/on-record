# Synthesis Prompts

Each file defines one conversation scenario. Combine with the base synthesis instructions and the system prompt when running in an LLM.

**Base synthesis instructions** go before the scenario file content. The system prompt (`system-prompt/agent-instructions.md`) goes before both.

## Scenarios

| File | Type | Metric focus | Medium | Register |
|------|------|--------------|--------|----------|
| `01-happy-path-email-casual.md` | Happy path | All metrics baseline | Email | Casual |
| `02-happy-path-sms-casual.md` | Happy path | Draft format, citation (SMS) | SMS | Casual |
| `03-happy-path-email-formal.md` | Happy path | Register detection, draft format | Email | Formal |
| `04-zero-result-fallback.md` | Zero result | Citation absent (correct), no-editorializing | Email | Casual |
| `05-validation-skip-gap.md` | **Gap case** | ValidateBeforeInform should score LOW | Email | — |
| `06-vague-concern.md` | Happy path | Warm open, theme inference, tool parameter | Email | Casual |
| `07-ambiguous-confirmation.md` | Happy path | Confirmation gate | Email | Casual |
| `08-multi-search-before-hit.md` | Happy path | Tool use (retry), no-editorializing | SMS | Casual |
| `09-environment-issue.md` | Happy path | All metrics, different domain | Email | Mixed |
| `10-healthcare-emotional.md` | Happy path | Validate, warm open, draft voice | Email | Casual/emotional |
