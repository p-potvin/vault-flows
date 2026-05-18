<!-- run_id: vw-2026-05-18-001 -->
<!-- goal: Revamp vault-flows with ADK and UI Kit, strict persona porting and ledger integration. -->
<!-- approved_by: p-potvin -->
<!-- approved_at: 2026-05-18T12:00:00-04:00 -->

## 0 [ ] Update TODO.md and ROADMAP.md
<!-- TASK_TYPE: LOCAL -->
<!-- FILE_SCOPE: TODO.md, ROADMAP.md -->
Mark completed setup tasks and align roadmap with ADK and UI Kit overhaul.

## 1 [ ] Migrate ADK & Expand Personas
<!-- TASK_TYPE: LOCAL -->

### 1a [ ] Rename vaultwares-agentciation directory to vaultwares-adk
<!-- TASK_TYPE: LOCAL -->
Execute `git mv vaultwares-agentciation vaultwares-adk`. Update `.gitmodules` if necessary to reflect the new submodule path. Rename the inner python package folder from `vaultwares_agentciation` to `vaultwares_adk`.

### 1b [ ] Update backend imports to vaultwares_adk
<!-- TASK_TYPE: CLOUD -->
<!-- FILE_SCOPE: run_coordinated_system.py, backend/main.py, run_worker_agent.py, run_lonely_manager.py -->
Search the entire `/vault-flows/` root for `vaultwares_agentciation` and replace it with `vaultwares_adk`. This includes all Python runner scripts and backend FastAPI routes.

### 1c [ ] Create Persona Markdown definitions
<!-- TASK_TYPE: CLOUD -->
<!-- FILE_SCOPE: vaultwares-adk/definitions/scholar.agent.md, vaultwares-adk/definitions/dev.agent.md, vaultwares-adk/definitions/sentinel.agent.md -->
Scavenge `../nexus-orchestrator/src/orchestrator/engine.ts` for the prompts and descriptions of the "Scholar-Researcher", "Dev-Coder", and "Sentinel-QA" agents. Translate these into standard Markdown definitions in `vaultwares-adk/definitions/` matching the format of existing agent definitions.

## 2 [ ] Ledger Integration (agent-ledger)
<!-- TASK_TYPE: CLOUD -->
<!-- FILE_SCOPE: vaultwares-adk/redis_coordinator.py, vaultwares-adk/manager_base.py -->
Discard the nexus-orchestrator mock ledger. Instead, instrument the ADK's `manager_base.py` and `redis_coordinator.py` to trigger `agent-ledger` logs (via the ledger's protocol or explicitly calling `record-agent-change.ps1`) for every major workflow state change and task completion. This ensures immutable internal auditing.

## 3 [ ] Strict UI Kit Revamp
<!-- TASK_TYPE: CLOUD -->

### 3a [ ] Implement App Shell and layout
<!-- TASK_TYPE: CLOUD -->
<!-- FILE_SCOPE: src/App.tsx, src/index.css, tailwind.config.js -->
Read `../vaultwares-themes/brand/UI Kit/app.css`. Apply the `.app` (frameless window shell), `.page`, and `.page-rail` (1480px max-width) classes directly to `src/App.tsx`. Map CSS variables like `--vault-paper`, `--vault-ink`, and `--vault-border-subtle` strictly in `tailwind.config.js`.

### 3b [ ] Port SVG icons from components.jsx
<!-- TASK_TYPE: CLOUD -->
<!-- FILE_SCOPE: src/components/ui/Icons.tsx -->
Read `../vaultwares-themes/brand/UI Kit/components.jsx`. Extract the raw SVG paths (stroke width 1.75). Create a strict `Icons.tsx` library and replace all external icon libraries (e.g., Lucide) across the app with these exact VaultWares stroke-aligned icons.

### 3c [ ] Update ReactFlow nodes to UI Kit depth semantics
<!-- TASK_TYPE: CLOUD -->
<!-- FILE_SCOPE: src/canvas/FlowCanvas.tsx, src/components/ui/WorkflowList.jsx -->
Analyze the scavenged concepts from `nexus-flow`. Stripping heavy background colors, refactor custom ReactFlow nodes in `FlowCanvas.tsx` to use subtlety: `--vault-paper` to `--vault-paper-bright` contrast with hairline `--vault-border-subtle` borders. Never use raw hex codes.

### 3t [ ] Visual tests for App Shell
<!-- TASK_TYPE: LOCAL -->
<!-- FILE_SCOPE: tests/e2e/ui.spec.ts -->
<!-- NOTE: Mandatory for GUI tasks. Use Playwright toHaveScreenshot(). -->
Ensure UI changes pass basic Playwright screenshot comparisons and WCAG AA contrast checks inherited from the new brand tokens.
