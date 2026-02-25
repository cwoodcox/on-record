<!-- BMAD:START -->
# BMAD Method — Project Instructions

## Project Configuration

- **Project**: write-your-legislator
- **User**: Corey
- **Communication Language**: English
- **Document Output Language**: English
- **User Skill Level**: intermediate
- **Output Folder**: {project-root}/_bmad-output
- **Planning Artifacts**: {project-root}/_bmad-output/planning-artifacts
- **Implementation Artifacts**: {project-root}/_bmad-output/implementation-artifacts
- **Project Knowledge**: {project-root}/docs

## BMAD Runtime Structure

- **Agent definitions**: `_bmad/bmm/agents/` (BMM module) and `_bmad/core/agents/` (core)
- **Workflow definitions**: `_bmad/bmm/workflows/` (organized by phase)
- **Core tasks**: `_bmad/core/tasks/` (help, editorial review, indexing, sharding, adversarial review)
- **Core workflows**: `_bmad/core/workflows/` (brainstorming, party-mode, advanced-elicitation)
- **Workflow engine**: `_bmad/core/tasks/workflow.xml` (executes YAML-based workflows)
- **Module configuration**: `_bmad/bmm/config.yaml`
- **Core configuration**: `_bmad/core/config.yaml`
- **Agent manifest**: `_bmad/_config/agent-manifest.csv`
- **Workflow manifest**: `_bmad/_config/workflow-manifest.csv`
- **Help manifest**: `_bmad/_config/bmad-help.csv`
- **Agent memory**: `_bmad/_memory/`

## Key Conventions

- Always load `_bmad/bmm/config.yaml` before any agent activation or workflow execution
- Store all config fields as session variables: `{user_name}`, `{communication_language}`, `{output_folder}`, `{planning_artifacts}`, `{implementation_artifacts}`, `{project_knowledge}`
- MD-based workflows execute directly — load and follow the `.md` file
- YAML-based workflows require the workflow engine — load `workflow.xml` first, then pass the `.yaml` config
- Follow step-based workflow execution: load steps JIT, never multiple at once
- Save outputs after EACH step when using the workflow engine
- The `{project-root}` variable resolves to the workspace root at runtime

## Available Agents

| Agent | Persona | Title | Capabilities |
|---|---|---|---|
| bmad-master | BMad Master | BMad Master Executor, Knowledge Custodian, and Workflow Orchestrator | runtime resource management, workflow orchestration, task execution, knowledge custodian |
| analyst | Mary | Business Analyst | market research, competitive analysis, requirements elicitation, domain expertise |
| architect | Winston | Architect | distributed systems, cloud infrastructure, API design, scalable patterns |
| dev | Amelia | Developer Agent | story execution, test-driven development, code implementation |
| pm | John | Product Manager | PRD creation, requirements discovery, stakeholder alignment, user interviews |
| qa | Quinn | QA Engineer | test automation, API testing, E2E testing, coverage analysis |
| quick-flow-solo-dev | Barry | Quick Flow Solo Dev | rapid spec creation, lean implementation, minimum ceremony |
| sm | Bob | Scrum Master | sprint planning, story preparation, agile ceremonies, backlog management |
| tech-writer | Paige | Technical Writer | documentation, Mermaid diagrams, standards compliance, concept explanation |
| ux-designer | Sally | UX Designer | user research, interaction design, UI patterns, experience strategy |

## Slash Commands

Use `/bmad-help` first to discover the next recommended BMAD workflow for your phase.

Available BMAD workflow/tool commands in this repo (from `_bmad/_config/bmad-help.csv`):

- **Core**: `/bmad-help`, `/bmad-brainstorming`, `/bmad-party-mode`, `/bmad-index-docs`, `/bmad-shard-doc`, `/bmad-editorial-review-prose`, `/bmad-editorial-review-structure`, `/bmad-review-adversarial-general`
- **BMM**: `/bmad-bmm-market-research`, `/bmad-bmm-domain-research`, `/bmad-bmm-technical-research`, `/bmad-bmm-create-product-brief`, `/bmad-bmm-create-prd`, `/bmad-bmm-validate-prd`, `/bmad-bmm-edit-prd`, `/bmad-bmm-create-ux-design`, `/bmad-bmm-create-architecture`, `/bmad-bmm-create-epics-and-stories`, `/bmad-bmm-check-implementation-readiness`, `/bmad-bmm-sprint-planning`, `/bmad-bmm-sprint-status`, `/bmad-bmm-create-story`, `/bmad-bmm-dev-story`, `/bmad-bmm-qa-automate`, `/bmad-bmm-code-review`, `/bmad-bmm-retrospective`, `/bmad-bmm-document-project`, `/bmad-bmm-generate-project-context`, `/bmad-bmm-quick-spec`, `/bmad-bmm-quick-dev`, `/bmad-bmm-correct-course`
- **BMM agent-invoked tools** (no slash command): load `/bmad-agent-bmm-tech-writer` and use codes `WD`, `US`, `MG`, `VD`, `EC`
- **BMB**: `/bmad_bmb_create_agent`, `/bmad_bmb_edit_agent`, `/bmad_bmb_validate_agent`, `/bmad_bmb_create_module_brief`, `/bmad_bmb_create_module`, `/bmad_bmb_edit_module`, `/bmad_bmb_validate_module`, `/bmad_bmb_create_workflow`, `/bmad_bmb_edit_workflow`, `/bmad_bmb_validate_workflow`, `/bmad_bmb_validate_max_parallel`, `/bmad_bmb_rework_workflow`
- **CIS**: `/bmad-cis-innovation-strategy`, `/bmad-cis-problem-solving`, `/bmad-cis-design-thinking`, `/bmad-cis-brainstorming`, `/bmad-cis-storytelling`
- **TEA**: `/bmad_tea_teach-me-testing`, `/bmad_tea_test-design`, `/bmad_tea_framework`, `/bmad_tea_ci`, `/bmad_tea_atdd`, `/bmad_tea_automate`, `/bmad_tea_test-review`, `/bmad_tea_nfr-assess`, `/bmad_tea_trace`

If a command isn't visible in your Copilot command picker, invoke it directly in chat using the exact slash command above.
<!-- BMAD:END -->
