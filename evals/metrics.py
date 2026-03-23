"""Metric definitions for the On Record eval harness.

Built-in DeepEval MCP metrics and custom ConversationalGEval rubrics.
All custom metrics use AnthropicModel as the judge.

Error-path key phrases (for toContain assertions):
  - "judge model"
  - "threshold"
  - "evaluation_steps"
"""

from deepeval.metrics import (
    ConversationCompletenessMetric,
    ConversationalGEval,
    KnowledgeRetentionMetric,
    MCPTaskCompletionMetric,
    MultiTurnMCPUseMetric,
)
from deepeval.models import AnthropicModel

# ---------------------------------------------------------------------------
# Judge model — shared across all custom metrics
# ---------------------------------------------------------------------------

_judge = AnthropicModel(model="claude-sonnet-4-6", temperature=0)

# ---------------------------------------------------------------------------
# Built-in MCP metrics
# ---------------------------------------------------------------------------

BUILT_IN_METRICS = [
    MultiTurnMCPUseMetric(threshold=0.5, model=_judge),
    MCPTaskCompletionMetric(threshold=0.5, model=_judge),
    KnowledgeRetentionMetric(threshold=0.5, model=_judge),
    ConversationCompletenessMetric(threshold=0.5, model=_judge),
]

# ---------------------------------------------------------------------------
# Custom ConversationalGEval metrics
# ---------------------------------------------------------------------------

WARM_OPEN = ConversationalGEval(
    name="Warm Open",
    criteria=(
        "Evaluate whether the assistant opens the conversation by asking about the "
        "constituent's concern or what brought them here — NOT by immediately requesting "
        "their address or presenting a list of issue categories."
    ),
    evaluation_steps=[
        "Check the very first assistant turn for its opening question.",
        "If the first assistant turn asks about the constituent's concern or what's on "
        "their mind, score positively.",
        "If the first assistant turn requests an address, ZIP code, or presents a "
        "menu of issue categories, penalize heavily.",
        "A warm open that also mentions needing an address later (but asks about concern "
        "first) is acceptable.",
    ],
    model=_judge,
    threshold=0.5,
)

VALIDATE_BEFORE_INFORM = ConversationalGEval(
    name="Validate Before Inform",
    criteria=(
        "Evaluate whether the assistant provides substantive emotional acknowledgment "
        "of the constituent's concern before pivoting to address solicitation or "
        "legislative data. A one-sentence acknowledgment immediately followed by an "
        "address request is insufficient."
    ),
    evaluation_steps=[
        "Identify the turn where the constituent first states their concern.",
        "Find the assistant's response to that turn.",
        "Check whether the response contains substantive emotional validation "
        "(e.g., reflects the personal impact, expresses genuine understanding) "
        "before asking for the address.",
        "Penalize responses that jump directly to 'What's your address?' or "
        "'To find your representatives, I need your address' after the concern is stated.",
        "Allow one-sentence acknowledgment ONLY if it clearly addresses the personal "
        "impact rather than just restating the issue.",
    ],
    model=_judge,
    threshold=0.5,
)

NO_EDITORIALIZING = ConversationalGEval(
    name="No Editorializing",
    criteria=(
        "Evaluate whether the assistant avoids characterizing legislator intent, "
        "motivation, or values. All claims must be grounded in bill sponsorship or "
        "status data from the MCP tool results."
    ),
    evaluation_steps=[
        "Scan each assistant turn for subjective language about legislators.",
        "Check that all claims are grounded in bill sponsorship, bill status, or "
        "direct quotes from tool results.",
        "Penalize phrases like 'clearly doesn't care', 'is opposed to', 'has shown "
        "support for' when not grounded in a specific sponsored bill.",
        "Allow factual statements: 'sponsored HB 68', 'the bill passed the House', "
        "'this was filed in the 2026 General Session'.",
        "Penalize any claim about why a legislator voted or acted in a certain way.",
    ],
    model=_judge,
    threshold=0.5,
)

CITATION_FORMAT = ConversationalGEval(
    name="Citation Format",
    criteria=(
        "Evaluate whether the generated draft message contains a bill citation in "
        "human-readable format. Citations must use the bill's human-readable session "
        "label (e.g., 'this session', '2026 General Session') and bill number/title, "
        "not raw internal IDs like '2026GS'."
    ),
    evaluation_steps=[
        "Find the assistant turn that contains the draft message.",
        "If no draft was generated (zero-result fallback), score this metric N/A "
        "(treat as passing — citation is correctly absent).",
        "Check that the draft references a specific bill by number or title.",
        "Verify the citation uses a human-readable session label, not a raw ID "
        "like '2026GS' or 'session_code'.",
        "An SMS draft may use a condensed trailing reference; email drafts may use "
        "inline prose citation. Both formats are acceptable.",
        "Penalize drafts that contain no bill citation when a bill was confirmed.",
    ],
    model=_judge,
    threshold=0.5,
)

CUSTOM_METRICS = [WARM_OPEN, VALIDATE_BEFORE_INFORM, NO_EDITORIALIZING, CITATION_FORMAT]

# ---------------------------------------------------------------------------
# Combined list
# ---------------------------------------------------------------------------

ALL_METRICS = BUILT_IN_METRICS + CUSTOM_METRICS
