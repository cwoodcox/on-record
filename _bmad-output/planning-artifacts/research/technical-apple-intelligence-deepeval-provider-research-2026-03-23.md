---
stepsCompleted: [1, 2, 3]
inputDocuments: []
workflowType: 'research'
lastStep: 3
research_type: 'technical'
research_topic: 'Apple Intelligence on-device model as the chatbot under test in DeepEval conversation simulation'
research_goals: 'Understand the interface and implementation approach for using Apple Intelligence as the chatbot under test (system being evaluated) in DeepEvals ConversationSimulator — not as the evaluation judge LLM'
user_name: 'Corey'
date: '2026-03-23'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-03-23
**Author:** Corey
**Research Type:** technical

---

## Research Overview

This report investigates the technical feasibility and implementation approach for integrating Apple Intelligence's on-device Foundation Model as a local LLM provider within the DeepEval Python evaluation framework. Research uses current web data with multi-source verification and confidence levels where noted.

---

## Technical Research Scope Confirmation

**Research Topic:** Apple Intelligence local model as a provider in the DeepEval project
**Research Goals:** Understand feasibility, architecture, and implementation approach for integrating Apple Intelligence as a local LLM provider within the DeepEval evaluation framework

**Technical Research Scope:**

- Architecture Analysis — design patterns, frameworks, system architecture
- Implementation Approaches — development methodologies, coding patterns
- Technology Stack — languages, frameworks, tools, platforms
- Integration Patterns — APIs, protocols, interoperability
- Performance Considerations — scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-23

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technology Stack Analysis

### Programming Languages

The two technology stacks involved speak different primary languages, which is the central integration challenge.

**Apple Foundation Models Framework (Swift)**
Apple's Foundation Models framework is **Swift-centric by design**. It exposes guided generation, constrained tool calling, and LoRA adapter fine-tuning via a Swift-native API accessible with as few as three lines of code. The framework is tightly coupled to Apple's developer toolchain (Xcode 26+, Apple Silicon) and is not natively callable from Python.
_Primary Language: Swift 6+_
_Platform: macOS 26, iOS 26, iPadOS 26, visionOS_
_Source: [Apple WWDC25 — Meet the Foundation Models framework](https://developer.apple.com/videos/play/wwdc2025/286/)_

**DeepEval (Python)**
DeepEval is a Python evaluation framework requiring **Python ≥ 3.9**. Its entire provider interface, metrics, and test runner are Python-native. It is published on PyPI and integrates with pytest-style test workflows.
_Primary Language: Python 3.9+_
_Source: [DeepEval PyPI](https://pypi.org/project/deepeval/)_

**The Bridge — Apple's Official Python SDK**
Apple has published an official Python SDK that provides a Pythonic interface to the Foundation Models framework: `github.com/apple/python-apple-fm-sdk`. This SDK enables:
- Batch inference and result analysis from Python
- On-device inference with the system foundation model
- Use in evaluation pipelines (explicitly cited in its README)

This SDK is the **primary and recommended bridge** between the two stacks. It requires Xcode 26.0+ and agreement to the Xcode and Apple SDKs license.
_Source: [apple/python-apple-fm-sdk (GitHub)](https://github.com/apple/python-apple-fm-sdk)_

**Community HTTP Bridge — VibeBridge**
A community project (`crowdllama/vibebridge`) wraps Apple's Foundation Models in a Swift-based HTTP server, exposing a REST API for LLM interactions. This provides an alternative integration path that is network-based rather than SDK-based.
_Source: [crowdllama/vibebridge (GitHub)](https://github.com/crowdllama/vibebridge)_

---

### Development Frameworks and Libraries

**Apple Side**
- **Foundation Models framework** (Apple, iOS/macOS 26+) — the on-device inference engine
- **Xcode 26** — required IDE and toolchain; includes a prompt playground and performance profiler
- **LoRA Adapter toolkit** — Python-based training workflow for fine-tuning rank-32 adapters against the base model
- _Source: [Apple Developer — Foundation Models Adapter Training](https://developer.apple.com/apple-intelligence/foundation-models-adapter/)_

**DeepEval Side**
- **deepeval** (Confident AI, PyPI) — evaluation framework with 50+ LLM-evaluated metrics (G-Eval, DAG, QAG, answer relevancy, hallucination, etc.)
- **pydantic** — used extensively for structured output schemas (`BaseModel`) injected into provider `generate()` methods
- **instructor / lm-format-enforcer** — optional libraries for enforcing JSON output from local models
- **LiteLLM** — multi-provider gateway; potentially usable if Apple's model could be fronted by an OpenAI-compatible server
- _Source: [DeepEval Custom LLMs Guide](https://deepeval.com/guides/guides-using-custom-llms)_

---

### Database and Storage Technologies

Neither Apple Foundation Models nor DeepEval impose database requirements for the local provider integration. Relevant considerations:

- **DeepEval test datasets** are typically stored as JSON/CSV files or managed via Confident AI's cloud platform
- **LoRA adapters** for Apple's model are file-based artifacts (packaged format specific to Foundation Models framework)
- No shared database layer is required for this integration

---

### Development Tools and Platforms

| Tool | Role |
|---|---|
| Xcode 26+ | Required to build and run Apple SDK; includes Foundation Models playground |
| Apple Silicon Mac | Required hardware for on-device inference (M-series chip) |
| Python 3.9+ | DeepEval runtime |
| pip / venv | Python dependency management |
| pytest | DeepEval's test runner (pytest-compatible) |
| apple/python-apple-fm-sdk | Official Python↔Swift bridge |

_Source: [Apple Developer — Apple Intelligence](https://developer.apple.com/apple-intelligence/)_
_Source: [DeepEval Getting Started](https://deepeval.com/docs/getting-started)_

---

### Cloud Infrastructure and Deployment

This integration is **explicitly local/on-device**. Key constraints:

- Inference runs on Apple Silicon hardware only — no cloud deployment path
- Apple's model requires Apple Intelligence to be enabled on the device
- Regional availability restrictions apply (model only available in supported locales)
- No external API costs; inference is free on-device
- **Private Cloud Compute** is Apple's server-side option (not relevant here — we want local-only)

_Source: [Apple Newsroom — Foundation Models framework](https://www.apple.com/newsroom/2025/09/apples-foundation-models-framework-unlocks-new-intelligent-app-experiences/)_

---

### Technology Adoption Trends

- Apple's Foundation Models framework **just became available to third-party developers** at WWDC 2025 (previously restricted to built-in system apps). The Python SDK is very new.
- DeepEval already has an established pattern for local model providers (Ollama is the primary reference implementation). The Ollama integration uses `DeepEvalBaseLLM` — the same interface that an Apple Intelligence provider would use.
- Community interest is high: VibeBridge (HTTP server wrapper) emerged quickly after WWDC 2025 as a workaround before the official Python SDK shipped.
- The **Ollama integration pattern** is directly analogous and serves as the implementation template: Ollama → local HTTP server → DeepEvalBaseLLM subclass. For Apple Intelligence, the `python-apple-fm-sdk` replaces Ollama as the local inference engine.

_Source: [DeepEval — Ollama Integration](https://deepeval.com/integrations/models/ollama)_
_Source: [apple/python-apple-fm-sdk (GitHub)](https://github.com/apple/python-apple-fm-sdk)_

---

## Integration Patterns Analysis

### Strategic Context: Two Distinct Integration Paths

> **Note:** During this research the project is considering a **strategic pivot** from the DeepEval evaluation use case to a **native iOS app** that uses the on-device Foundation Model to help compose constituent messages. Both paths are documented here as they share significant underlying technology but diverge sharply on integration architecture.

| | Path A: DeepEval Provider | Path B: iOS Message Composition App |
|---|---|---|
| **Language** | Python | Swift |
| **Platform** | macOS 26 (dev machine) | iOS 26 + macOS 26 |
| **Primary API** | `python-apple-fm-sdk` → `DeepEvalBaseLLM` | `FoundationModels` framework directly |
| **User** | Developer/evaluator | Constituent (end user) |
| **Network required** | No | No |
| **Structured output** | Pydantic `BaseModel` via schema injection | `@Generable` Swift macro |

---

### API Design Patterns

#### Path A — DeepEval Provider Interface

The `DeepEvalBaseLLM` abstract class defines a four-method contract:

| Method | Signature | Notes |
|---|---|---|
| `load_model()` | `-> Any` | Returns underlying model handle |
| `generate()` | `(prompt: str, schema: BaseModel \| None) -> str \| BaseModel` | Sync; DeepEval injects Pydantic schema when structured output is needed |
| `a_generate()` | same signature, `async` | Async variant; must match `generate()` signature exactly |
| `get_model_name()` | `-> str` | Returns display name string |

The `python-apple-fm-sdk` exposes:
- `fm.SystemLanguageModel` — model handle (maps to `load_model()` return)
- `fm.LanguageModelSession(model, ...)` — session factory
- `await session.respond(prompt)` — async text generation
- `await session.respond(prompt, generating=MyGenerable)` — structured output generation

**Key impedance mismatch:** DeepEval injects Pydantic `BaseModel` schemas dynamically; the SDK uses `@fm.generable` decorator (a static Swift-derived schema). The integration must bridge these at runtime — likely by mapping Pydantic fields → SDK generable schema, or by using free-text generation + JSON parsing as a fallback.

_Source: [DeepEval — Using Custom LLMs](https://deepeval.com/guides/guides-using-custom-llms)_
_Source: [python-apple-fm-sdk — Basic Usage](https://apple.github.io/python-apple-fm-sdk/basic_usage.html)_

#### Path B — Foundation Models Swift API

The Swift API for message composition follows a session-based pattern:

```swift
let session = LanguageModelSession {
    "You help constituents write clear, concise messages to their elected representatives."
}
let response = try await session.respond(to: userInput)
```

Streaming (for real-time UI feedback as text generates):
```swift
for try await partial in session.streamResponse(to: prompt) {
    updateUI(partial)
}
```

Structured rewrite with `@Generable`:
```swift
@Generable struct RewrittenMessage {
    var subject: String
    var body: String
    var tone: String
}
let result = try await session.respond(to: prompt, generating: RewrittenMessage.self)
```

_Source: [Apple Developer Docs — Generating content with Foundation Models](https://developer.apple.com/documentation/FoundationModels/generating-content-and-performing-tasks-with-foundation-models)_
_Source: [Deep dive into the Foundation Models framework — WWDC25](https://developer.apple.com/videos/play/wwdc2025/301/)_

---

### Communication Protocols and Data Formats

#### Path A — Python IPC to Swift Runtime

The `python-apple-fm-sdk` calls the Foundation Models framework in Swift **under the hood** — it is not an HTTP API but an in-process bridge. The communication is:

```
Python (deepeval metric) → python-apple-fm-sdk → Swift runtime → on-device model
```

No network protocol is involved. Data flows as Python objects ↔ Swift objects via the SDK's bindings. This means:
- No serialization overhead
- No port management or server lifecycle
- Failure mode: SDK process crash rather than HTTP error

An alternative path via **VibeBridge** (HTTP REST) would use:
- `POST /generate` with JSON body `{"prompt": "..."}` → JSON response
- OpenAI-compatible endpoint shape (to be confirmed — not verified in current docs)
- This enables `LiteLLMModel` integration in DeepEval if VibeBridge implements OpenAI API compatibility

_Source: [crowdllama/vibebridge](https://github.com/crowdllama/vibebridge)_

#### Path B — In-Process Swift API

No inter-process communication. The Foundation Models framework runs entirely within the iOS/macOS app process. Communication is:

```
SwiftUI view → LanguageModelSession.respond() → on-device model → streaming response → SwiftUI state update
```

Data format is `String` (free text) or typed Swift structs via `@Generable`.

---

### System Interoperability Approaches

#### Writing Tools (Path B Variant)

Apple Intelligence's **Writing Tools** system feature automatically integrates with any app using standard `UITextView` / SwiftUI `TextEditor`. This provides a **zero-code integration path** for basic message composition assistance:

- System-level rewrite, summarize, proofread available automatically
- Accessible from any text field via the Apple Intelligence callout bar
- No Foundation Models framework code required
- Behavior customizable via `writingToolsBehavior(_:)` modifier

This is the **lowest-friction approach** for the iOS pivot: use standard text components and let Writing Tools handle composition assistance automatically.

For **deeper control** (custom prompts, app-specific tone, structured output, in-app UI), the Foundation Models framework is required.

_Source: [Apple Developer Docs — Writing Tools](https://developer.apple.com/documentation/uikit/writing-tools)_

---

### Key Integration Risks

| Risk | Path A (DeepEval) | Path B (iOS App) |
|---|---|---|
| **Structured output bridging** | High — Pydantic↔generable schema mismatch requires runtime adapter | Low — `@Generable` is native |
| **Async/sync mismatch** | Medium — SDK is async, DeepEval `generate()` is sync; need `asyncio.run()` | None |
| **Device availability** | Medium — requires Apple Silicon Mac, macOS 26, AI enabled | Medium — iPhone 15 Pro+ required for iOS |
| **Context window errors** | Must catch `exceededContextWindowSize` in both paths | Same |
| **Guardrail violations** | Must handle `guardrailViolation` error; affects eval reliability | Same |
| **Model scope** | High — 3B model not suited for complex reasoning metrics (G-Eval chain-of-thought may degrade) | Low — message composition is a strength use case |

_Source: [apple/python-apple-fm-sdk — Getting Started](https://apple.github.io/python-apple-fm-sdk/getting_started.html)_
_Source: [Apple Developer — Foundation Models Docs](https://developer.apple.com/documentation/foundationmodels)_

---

## Scope Correction: Chatbot Under Test, Not Evaluation Judge

> **Research correction (2026-03-23):** Earlier sections of this document assumed Apple Intelligence would be used as the *evaluation judge* (i.e., replacing GPT-4 as the LLM that scores metrics). The actual use case is different: Apple Intelligence is the **chatbot under test** — the system whose responses are being evaluated. The evaluation judge remains a capable external model (e.g., GPT-4, Claude).
>
> This changes the integration surface entirely. `DeepEvalBaseLLM` subclassing is **not required**. The relevant API is `ConversationSimulator` and its `model_callback` interface.

---

## Correct Integration Pattern: ConversationSimulator Callback

### How DeepEval's ConversationSimulator Works

`ConversationSimulator` drives a multi-turn dialogue between a synthetic user (powered by the evaluation LLM) and the **chatbot under test** (Apple Intelligence). It produces `ConversationalTestCase` objects that are then scored by conversational metrics (Knowledge Retention, Turn Relevancy, Role Adherence, etc.) — all using the evaluation LLM, not Apple's model.

The chatbot under test is wired in via a single **async callback function**:

```python
async def model_callback(input: str, turns: List[Turn], thread_id: str) -> Turn:
    res = await your_llm_app(input, turns, thread_id)
    return Turn(role="assistant", content=res)
```

This is the **only interface Apple Intelligence needs to satisfy** — return a string response given a string input.

_Source: [DeepEval — Conversation Simulator](https://deepeval.com/docs/conversation-simulator)_

---

### The Integration: Apple Intelligence as `model_callback`

The implementation is straightforward:

1. **One `LanguageModelSession` per `thread_id`** — Apple's sessions are stateful and maintain multi-turn context natively. Store sessions in a dict keyed by `thread_id`.
2. **In the callback**, call `await session.respond(input)` and return the response string wrapped in `Turn`.
3. **No Pydantic schema bridging needed** — the callback returns plain text; DeepEval's evaluation metrics handle structured extraction separately using the judge LLM.

Conceptual implementation:

```python
import apple_fm_sdk as fm
from deepeval.test_case import Turn
from deepeval.conversation_simulator import ConversationSimulator

sessions: dict[str, fm.LanguageModelSession] = {}

async def apple_intelligence_callback(
    input: str,
    turns: list[Turn],
    thread_id: str
) -> Turn:
    if thread_id not in sessions:
        model = fm.SystemLanguageModel.default
        sessions[thread_id] = fm.LanguageModelSession(
            model,
            instructions="You are a constituent services chatbot..."
        )
    session = sessions[thread_id]
    response = await session.respond(input)
    return Turn(role="assistant", content=response.content)

simulator = ConversationSimulator(model_callback=apple_intelligence_callback)
test_cases = simulator.simulate(goldens=goldens, max_turns=10)
```

### Why This Is Much Simpler Than Path A

| Concern | Path A (judge LLM) | Correct path (chatbot under test) |
|---|---|---|
| `DeepEvalBaseLLM` subclass | Required | **Not required** |
| Pydantic schema bridging | Hard — dynamic schema injection | **Not applicable** |
| Async/sync mismatch | Requires `asyncio.run()` shim | **Natural** — callback is `async` |
| Structured output | Needed for metric extraction | **Not needed** — judge handles that |
| Complexity | High | **Low** |

### Remaining Constraints

- **macOS 26 + Apple Silicon required** — the callback only runs on a qualifying dev machine; cannot run in CI on Linux runners
- **Apple Intelligence must be enabled** on the machine
- **Context window limit** — `exceededContextWindowSize` must be caught in the callback and handled (e.g., start a fresh session for `thread_id`)
- **Guardrail violations** — `guardrailViolation` errors from Apple's model must be caught and surfaced gracefully (e.g., return a `Turn` indicating the model declined to respond)
- **Non-determinism** — Apple's model output is sampled by default; set `GenerationOptions` temperature to 0 (greedy) for reproducible eval runs
- **No streaming needed** — `ConversationSimulator` consumes complete turn responses, not streams

_Source: [DeepEval — Conversation Simulator](https://deepeval.com/docs/conversation-simulator)_
_Source: [DeepEval — Chatbot Evaluation Quickstart](https://deepeval.com/docs/getting-started-chatbots)_
_Source: [python-apple-fm-sdk — Basic Usage](https://apple.github.io/python-apple-fm-sdk/basic_usage.html)_

---

## Architectural Patterns

### ConversationSimulator API Reference (Confirmed)

**Constructor:**

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `model_callback` | `async (input, turns?, thread_id?) → Turn` | required | Your chatbot under test |
| `simulator_model` | `str` or `DeepEvalBaseLLM` | `"gpt-4.1"` | The judge/user-simulator LLM |
| `async_mode` | `bool` | `True` | Concurrent conversation simulation |
| `max_concurrent` | `int` | `100` | Max parallel conversations |

**`simulate()` method:**

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `conversational_goldens` | `List[ConversationalGolden]` | required | Scenario definitions |
| `max_user_simulations` | `int` | `10` | Max user-assistant cycles per conversation |

A conversation stops early when the `expected_outcome` in a `ConversationalGolden` is reached (evaluated by `simulator_model`). If no `expected_outcome`, it runs to `max_user_simulations`.

**`on_simulation_complete` hook** — fires as each `ConversationalTestCase` completes, before all simulations finish. Useful for streaming results or early abort.

_Source: [DeepEval — Conversation Simulator](https://deepeval.com/docs/conversation-simulator)_

---

### Session Lifecycle Strategy

**Decision: one `LanguageModelSession` per `thread_id`, created lazily.**

Apple's `LanguageModelSession` is stateful — it maintains a Transcript of all prior turns. This maps directly to DeepEval's `thread_id` concept. The correct architecture is:

```python
_sessions: dict[str, fm.LanguageModelSession] = {}

def _get_or_create_session(thread_id: str) -> fm.LanguageModelSession:
    if thread_id not in _sessions:
        model = fm.SystemLanguageModel()
        _sessions[thread_id] = fm.LanguageModelSession(
            model,
            instructions="System prompt here..."
        )
    return _sessions[thread_id]
```

**Do not reconstruct context from `turns`** — the Apple session already tracks its own transcript, and reconstructing from `turns` would duplicate history and confuse the model.

**Concavity:** `ConversationSimulator` defaults to `async_mode=True` with up to 100 concurrent conversations. Apple's `LanguageModelSession` can only process **one request at a time** per instance — concurrent calls to the same session raise `rateLimited`. Since each conversation has a unique `thread_id` with its own session instance, concurrency across conversations is safe. Set `max_concurrent` to a conservative value (e.g., `5`) during initial testing.

---

### Context Window Overflow Strategy

Apple's model has a fixed **4096-token context window** per session. Long conversations will eventually overflow. Two recovery options:

**Option A — Hard reset (simple, loses context):**
```python
except fm.ExceededContextWindowSizeError:
    # Discard the saturated session, start fresh
    _sessions.pop(thread_id, None)
    session = _get_or_create_session(thread_id)
    response = await session.respond(input)
    return Turn(role="assistant", content=str(response))
```

**Option B — Partial preservation (complex, retains instructions + last turn):**
Carry forward the system instructions and the most recent assistant turn into a fresh session. This requires accessing the session transcript — check whether `python-apple-fm-sdk` exposes it (Swift's `LanguageModelSession.transcript` property exists; Python binding availability TBD).

**Recommendation for evaluation use:** Option A is sufficient. DeepEval's `max_user_simulations` defaults to 10 turns; at typical constituent query lengths, 4096 tokens is unlikely to be hit. Add a test assertion that verifies `len(turns) < 10` when overflow does occur.

---

### Guardrail Violation Strategy

Apple's guardrails scan for safety policy violations and raise `GuardrailViolationError`. In evaluation context this is a signal worth capturing, not hiding.

```python
except fm.GuardrailViolationError as e:
    # Surface the refusal as a Turn so the evaluator can score it
    return Turn(
        role="assistant",
        content=f"[GUARDRAIL_VIOLATION: {e}]"
    )
```

Evaluators like **Role Adherence** and **Conversation Completeness** will score a guardrail refusal differently from a helpful response — which is the desired behavior. It tests whether the chatbot correctly refuses inappropriate constituent queries.

---

### Determinism Configuration

Apple's model samples by default. For reproducible eval runs, configure greedy decoding via `GenerationOptions`:

```python
# Swift API — Python SDK GenerationOptions availability TBD
options = fm.GenerationOptions(temperature=0.0)  # greedy
response = await session.respond(input, options=options)
```

**Check python-apple-fm-sdk docs** for whether `GenerationOptions` is exposed in the Python bindings — the Swift API has it but Python binding parity is not confirmed. If unavailable, document this as a known non-determinism source and run each scenario 3× and take the modal result.

_Source: [python-apple-fm-sdk GitHub](https://github.com/apple/python-apple-fm-sdk)_
_Source: [Apple Developer — exceededContextWindowSize](https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror/exceededcontextwindowsize(_:))_
_Source: [Apple Developer Forums — guardrailViolation](https://developer.apple.com/forums/thread/792908)_

---

### CI/CD Strategy

Apple Intelligence is macOS 26 + Apple Silicon only — it cannot run on Linux CI runners. Strategies:

| Strategy | Tradeoff |
|---|---|
| `pytest.mark.skipif(not apple_available)` guard | Tests silently skip on Linux; no CI gate |
| Dedicated macOS GitHub Actions runner (`macos-15-xlarge`) | Expensive; Apple Intelligence requires on-device setup beyond base runner |
| Local-only eval harness, results committed as artifacts | Manual; breaks CI automation goal |
| Mock callback for CI, real callback locally | CI tests the harness wiring; real evals run separately |

**Recommended pattern:** ship a `APPLE_INTELLIGENCE_AVAILABLE` environment variable gate. The callback detects availability via `fm.SystemLanguageModel().is_available()` and either runs the real model or raises `pytest.skip()` with a message. This keeps tests portable without silent failures.

```python
import pytest
import apple_fm_sdk as fm

def check_apple_intelligence():
    model = fm.SystemLanguageModel()
    available, reason = model.is_available()
    if not available:
        pytest.skip(f"Apple Intelligence unavailable: {reason}")
```

---

### Scenario Design for on-record

`ConversationalGolden` fields for constituent services chatbot scenarios:

```python
ConversationalGolden(
    user_description="A Utah resident concerned about a local zoning change",
    scenario=(
        "The constituent wants to find out which state representative "
        "covers their address and whether any related bills are active."
    ),
    expected_outcome=(
        "The chatbot correctly identifies the house and senate districts, "
        "names the representative, and surfaces at least one relevant bill."
    ),
)
```

Scenario categories to cover:
1. **Happy path** — valid address → district lookup → representative → bills
2. **Ambiguous address** — partial address, city only, ZIP-only
3. **Out-of-state address** — graceful decline
4. **No active bills** — correct "nothing found" response without hallucination
5. **Off-topic query** — guardrail / scope refusal
6. **Multi-turn follow-up** — "who is my senator?" → "what bills are they sponsoring?"

Metrics to apply: **Knowledge Retention** (does the chatbot remember the address across turns?), **Conversation Completeness** (does it actually answer the constituent's need?), **Turn Relevancy** (are responses on-topic?), **Role Adherence** (does it stay within constituent services scope?).

_Source: [DeepEval — Chatbot Evaluation Quickstart](https://deepeval.com/docs/getting-started-chatbots)_
_Source: [DeepEval — Conversation Simulator](https://deepeval.com/docs/conversation-simulator)_

---

## Open Questions Resolved

### GenerationOptions in Python SDK — CONFIRMED AVAILABLE

`generation_options.py` exists in `src/apple_fm_sdk/` and is fully exposed. The `respond()` method accepts an `options: Optional[GenerationOptions]` keyword argument. Confirmed API:

```python
from apple_fm_sdk import GenerationOptions, SamplingMode

# Greedy (deterministic) — recommended for eval runs
options = GenerationOptions(sampling=SamplingMode.greedy())

# Temperature-controlled
options = GenerationOptions(temperature=0.3)

# Token limit
options = GenerationOptions(maximum_response_tokens=512)

response = await session.respond(prompt, options=options)
```

`SamplingMode.greedy()` — always selects the most likely token; deterministic for the same model version. Note: model updates from Apple may change greedy output even with the same prompt.

`SamplingMode.random(top, probability_threshold, seed)` — top-k or top-p with optional seed for reproducible random sampling.

The `options` parameter applies per-request and overrides session-level defaults.

**Implication for eval harness:** Use `GenerationOptions(sampling=SamplingMode.greedy())` in the callback. No workaround needed.

_Source: [python-apple-fm-sdk — generation_options.py](https://github.com/apple/python-apple-fm-sdk/blob/main/src/apple_fm_sdk/generation_options.py)_
_Source: [python-apple-fm-sdk — session.py](https://github.com/apple/python-apple-fm-sdk/blob/main/src/apple_fm_sdk/session.py)_

---

## Summary and Recommendations

### Feasibility Verdict

**Feasible on qualifying hardware.** Apple Intelligence as the chatbot under test in DeepEval's `ConversationSimulator` is a clean, low-friction integration. The Python SDK's async `respond()` method maps directly to the callback interface. No bridging, no schema injection, no `DeepEvalBaseLLM` subclassing required.

### Complete Callback Implementation

```python
import apple_fm_sdk as fm
from deepeval.test_case import Turn
from deepeval.conversation_simulator import ConversationSimulator

_sessions: dict[str, fm.LanguageModelSession] = {}
_greedy = fm.GenerationOptions(sampling=fm.SamplingMode.greedy())

async def apple_intelligence_callback(
    input: str,
    turns: list[Turn],
    thread_id: str,
) -> Turn:
    # Availability guard
    model = fm.SystemLanguageModel()
    available, reason = model.is_available()
    if not available:
        import pytest
        pytest.skip(f"Apple Intelligence unavailable: {reason}")

    # Session lifecycle: one stateful session per conversation
    if thread_id not in _sessions:
        _sessions[thread_id] = fm.LanguageModelSession(
            model,
            instructions="You are a constituent services chatbot...",
        )
    session = _sessions[thread_id]

    try:
        response = await session.respond(input, options=_greedy)
        return Turn(role="assistant", content=str(response))
    except fm.ExceededContextWindowSizeError:
        _sessions.pop(thread_id, None)  # hard reset, lose context
        session = fm.LanguageModelSession(model, instructions="...")
        _sessions[thread_id] = session
        response = await session.respond(input, options=_greedy)
        return Turn(role="assistant", content=str(response))
    except fm.GuardrailViolationError as e:
        return Turn(role="assistant", content=f"[GUARDRAIL_VIOLATION: {e}]")

simulator = ConversationSimulator(
    model_callback=apple_intelligence_callback,
    simulator_model="gpt-4.1",   # judge/user-simulator — NOT Apple
    async_mode=True,
    max_concurrent=5,             # conservative; each session is single-threaded
)
```

### Key Constraints Summary

| Constraint | Detail |
|---|---|
| Hardware | macOS 26 + Apple Silicon + Apple Intelligence enabled |
| Python SDK | `pip install apple-fm-sdk` — Beta, macOS-only |
| Context window | 4096 tokens per session — guard with `ExceededContextWindowSizeError` |
| Concurrency | One request/session at a time — use `max_concurrent=5` |
| Determinism | `SamplingMode.greedy()` — deterministic within a model version |
| CI | Cannot run on Linux; gate with `pytest.skip()` via `is_available()` |
| Evaluation judge | Must remain external (GPT-4.1, Claude) — Apple model is SUT only |

### Differences vs Current Claude-Based Callback (E5-2)

The existing `model_callback` in `evals/chatbot.py` uses **Claude** as the chatbot under test (via Anthropic API + MCP tool proxying). Apple Intelligence as the SUT is a fundamentally different architecture:

- **No MCP tool proxying** — Apple's on-device model cannot call the MCP server. It receives only the text input and produces text output.
- **No Anthropic API** — entirely local, no API key, no latency from network calls.
- **No tool schema injection** — `MCP_TOOL_SCHEMAS` and `MCPToolCall` tracking are specific to the Claude-based callback.
- **Different system prompt handling** — instructions are passed at `LanguageModelSession` init, not per-message.

**Practical implication:** Apple Intelligence as SUT evaluates a *different thing* than the Claude-based callback. It tests whether Apple's model can act as a general constituent services chatbot given only natural language — without the MCP tool infrastructure. This is a valid and interesting evaluation, but it is not equivalent to the full on-record chatbot stack.

### Recommendation

For the E5 eval harness, the primary SUT should remain **Claude + MCP** (the actual production stack). Apple Intelligence as SUT is a **secondary / comparative eval** — useful for benchmarking Apple's model's conversational quality against Claude's on the same scenarios, without tool use.

If Apple Intelligence SUT is desired, it warrants its own callback module (`evals/apple_chatbot.py`) and its own set of goldens that do not require `mcp_tools_called` tracking. The existing `evals/chatbot.py` remains the primary callback unchanged.

_Source: [python-apple-fm-sdk — Basic Usage](https://apple.github.io/python-apple-fm-sdk/basic_usage.html)_
_Source: [Apple Developer — Foundation Models](https://developer.apple.com/documentation/foundationmodels)_
