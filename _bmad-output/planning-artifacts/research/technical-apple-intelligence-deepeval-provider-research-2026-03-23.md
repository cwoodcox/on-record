---
stepsCompleted: [1, 2]
inputDocuments: []
workflowType: 'research'
lastStep: 2
research_type: 'technical'
research_topic: 'Apple Intelligence local model as a provider in the DeepEval project'
research_goals: 'Understand feasibility, architecture, and implementation approach for integrating Apple Intelligence as a local LLM provider within the DeepEval evaluation framework'
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
