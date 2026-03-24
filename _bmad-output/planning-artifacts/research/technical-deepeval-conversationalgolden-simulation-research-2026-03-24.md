---
stepsCompleted: [1, 2]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'deepeval ConversationGolden for conversation simulation'
research_goals: 'Getting started with building ConversationGolden datasets and running conversation simulation tests in deepeval'
user_name: 'Corey'
date: '2026-03-24'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-24
**Author:** Corey
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** deepeval ConversationGolden for conversation simulation
**Research Goals:** Getting started with building ConversationGolden datasets and running conversation simulation tests in deepeval

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-24

---

## Technology Stack Analysis

### Programming Languages

deepeval is a Python-only framework (Python `>3.9, <4.0`; tested on 3.9–3.11, compatible to 3.13). There is no JavaScript/TypeScript SDK. The `ConversationalGolden` and `ConversationSimulator` APIs are implemented as Pydantic v2 `BaseModel` classes, so all test authoring is done in Python.

_Popular Language:_ Python 3.10–3.12 (most common in CI pipelines per the official docs)
_Language Evolution:_ Optional integrations (crewai, openai-agents, llama-index) require Python >=3.10; Python 3.9 support is maintained for core only
_Source: https://pypi.org/project/deepeval/ — https://github.com/confident-ai/deepeval_

### Development Frameworks and Libraries

**Core deepeval package (v3.9.2, released 2026-03-20):**

| Package | Role |
|---|---|
| `pydantic ^2.11.7` | Data model for `ConversationalGolden`, `Turn`, `LLMTestCase`, etc. |
| `openai` (latest) | Default simulator/judge LLM provider |
| `pytest` + `pytest-xdist`, `pytest-asyncio` | Test runner integration (bundled) |
| `tenacity >=8.0.0` | Retry logic for LLM API calls |
| `aiohttp` | Async HTTP for concurrent simulation |
| `nest_asyncio` | Allows `asyncio.run()` inside Jupyter |
| `rich` | Console output formatting |
| `tqdm ^4.66.1` | Progress bars during `simulate()` |
| `jinja2` | Prompt templating |

**Optional framework integrations** (Python >=3.10):
- `crewai`, `pydantic-ai`, `openai-agents ^0.3.3`, `llama-index ^0.14.4`, `langchain 1.2.4`, `langgraph 1.0.7`

_Source: https://github.com/confident-ai/deepeval — pyproject.toml_

### Database and Storage Technologies

deepeval itself has no database dependency. Dataset persistence is handled two ways:
- **Local:** `EvaluationDataset` serialized to JSON via `add_goldens_from_json_file()` / `export_to_json()`. Known bug: `comments`, `custom_column_key_values` fields not correctly deserialized from JSON (GitHub Issue #2056).
- **Cloud:** Confident AI platform via `dataset.push(alias="...")` / `dataset.pull(alias="...")`. SOC 2 Type II compliant. Supports `finalized=False` for draft datasets not yet active in evaluation.

_Source: https://deepeval.com/docs/evaluation-datasets_

### Development Tools and Platforms

- **CLI:** `deepeval test run`, `deepeval set-openai-key`, `deepeval set-gemini`, etc.
- **Test runner:** `deepeval test run test_file.py -n 4 -c -v` — wraps pytest with deepeval plugin
- **Evaluation modes:** `assert_test()` (pytest path) or `evaluate()` (notebook/script path) — cannot mix in same test file
- **Jupyter support:** Full support via `nest_asyncio`; `evaluate()` preferred over `assert_test()` in notebooks
- **IDE:** Standard Python tooling (no deepeval-specific IDE plugin)

_Source: https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd_

### Cloud Infrastructure and Deployment

- **LLM Judge (default):** OpenAI GPT-4.1 — requires `OPENAI_API_KEY`
- **Alternate judges:** Azure OpenAI, Gemini, Anthropic Claude, Ollama (local), any `DeepEvalBaseLLM` subclass — swap via `simulator_model` parameter on `ConversationSimulator`
- **Confident AI Dashboard:** Optional SaaS platform for storing test runs, datasets, and production traces. On-prem deployment available.
- **CI/CD:** `deepeval test run` emits non-zero exit code on failure; drop-in for GitHub Actions, GitLab CI, Jenkins

_Source: https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd_

### Technology Adoption Trends

- deepeval 14,100+ GitHub stars, 1,300+ forks (Apache 2.0) as of March 2026
- Version 3.9.2 adds `language` parameter to `ConversationSimulator` (multi-language simulation)
- MCP tool/resource/prompt fields added to `Turn` for MCP-based agent evaluation
- `ConversationSimulator` introduced in late 2024 (PR #1876); active development continues
- Known open issue: double initial user-turn bug (#1884) in `simulate()` — workaround: filter first turn if needed

_Source: https://deepeval.com/changelog/changelog-2025 — https://github.com/confident-ai/deepeval_
