# Vault Flows Improvement Scan

Date: 2026-05-02

Scope: UI/UX, design system, workflow architecture, runtime/pipeline model, persistence, performance, security, and test coverage.

This scan was performed by reading the repository through the connected GitHub workspace. I did not run the app locally in this pass, so build/runtime observations are based on source inspection rather than a fresh local execution.

## Executive assessment

Vault Flows is currently closer to a deployable workflow dashboard plus individual AI utility panels than to a generalized node-based programming environment.

The strongest product direction is already visible: runtime configuration, model catalog scanning, local bridge execution, workflow CRUD, captioning, LoRA planning, face-swap handoff, and agent coordination are all useful ingredients. The weak point is that these capabilities are not yet represented as composable graph primitives. They live as separate panels and hard-coded flows.

To reach the stated final goal — a node-based interface capable of creating almost any workflow imaginable — the app needs to become graph-first:

- Workflow data should be a typed graph, not just a list item with name/category/description.
- Features should become reusable nodes, not isolated full-page widgets.
- Execution should be modeled as a visible, inspectable DAG/state machine.
- Runtime adapters should compile or dispatch the same graph to local bridge, ComfyUI, remote API, browser-only helpers, or future backends.
- The UI should feel like a programming environment, not a settings dashboard.

## Highest-priority recommendations

1. **Build the graph schema before expanding more feature panels.**
   - Add a formal workflow graph model with nodes, ports, edges, config, layout, versioning, variables, inputs, outputs, and execution state.
   - Every future workflow feature should be expressed through this schema.

2. **Replace the placeholder advanced editor with a real canvas MVP.**
   - The dedicated workflow page should load, edit, validate, save, and execute a graph.
   - Minimum viable editor: add node, move node, connect ports, edit node config, save, reload, validate graph.

3. **Turn current AI tools into nodes.**
   - Image captioning, LoRA planning, face-swap, storage upload, export, backup, and model scan should become node types.
   - Existing panels can remain as detail inspectors, but the graph should become the orchestration layer.

4. **Consolidate configuration storage.**
   - The app currently has overlapping local config persistence paths. This risks users editing one config snapshot while runtime code reads another.
   - There should be one config repository abstraction with local, remote, and fallback implementations.

5. **Make runtime mode visible and honest everywhere.**
   - Silent remote-to-local fallback is useful for demos but dangerous for real workflows.
   - The UI should always show whether the user is in browser-local, local-bridge, local-ComfyUI, remote API, or degraded fallback mode.

6. **Fix validation gaps before deeper backend integration.**
   - The config model includes API-key behavior in the data layer, but the strict config update schema does not accept `apiKey`.
   - Add graph validation, node schema validation, edge compatibility validation, and migration tests.

7. **Move long-running execution to an async job model.**
   - A 1.5 second request timeout is acceptable for fast metadata calls, but not for video processing, LoRA training, or multi-step workflows.
   - Runtime execution should use jobs with polling, Server-Sent Events, or WebSocket updates.

8. **Strengthen local bridge security and lifecycle management.**
   - Restrict CORS, add a local auth token, enforce upload size limits, clean temporary files, and replace deprecated multipart handling.

9. **Make the visual system consistent and scalable.**
   - Centralize color, spacing, type, focus, state, and node-category tokens.
   - Current styling mixes Tailwind, inline theme styles, and panel-specific color choices.

10. **Expand tests around the future product, not just the dashboard shell.**

- Add tests for graph creation, connection, validation, persistence, restore/export, execution state, keyboard navigation, and modal focus behavior.

## Product north star

Vault Flows should become a visual programming language for AI/media/data workflows.

### Core mental model

- **Nodes** are functions, tools, models, file operations, control-flow constructs, or UI inputs.
- **Ports** are typed function arguments and return values.
- **Edges** are typed data/control connections.
- **Subflows** are reusable functions.
- **Workflow templates** are programs.
- **Runs** are debuggable execution traces.
- **Adapters** compile or dispatch graphs to specific execution targets.

### Suggested node categories

| Category | Example nodes | Visual treatment |
| --- | --- | --- |
| Input | File, folder, prompt, URL, webcam, uploaded asset | Neutral gray/blue |
| Model | VLM captioner, diffusion checkpoint, LoRA, face swapper | Purple/violet |
| Transform | Crop, resize, mask, caption clean-up, frame extraction | Cyan/teal |
| Control | Branch, loop, map, merge, retry, condition | Orange/amber |
| Storage | Upload, save local, export JSON, backup, database write | Green |
| Agent | Dispatch task, wait for agent, collect result | Indigo |
| Output | Preview image/video, download file, publish artifact | Emerald |
| Debug | Log, inspect value, breakpoint, assert | Red/rose |

## Architecture improvements

### 1. Introduce a graph domain model

Create a schema similar to:

```ts
type WorkflowGraph = {
  id: string;
  version: number;
  name: string;
  description?: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  layout: GraphLayout;
  execution?: WorkflowExecutionSnapshot;
  createdAt: string;
  updatedAt: string;
};
```

Each node should include:

```ts
type WorkflowNode = {
  id: string;
  type: string;
  version: string;
  title: string;
  position: { x: number; y: number };
  inputs: NodePort[];
  outputs: NodePort[];
  config: Record<string, unknown>;
  ui?: {
    color?: string;
    icon?: string;
    collapsed?: boolean;
    notes?: string;
  };
};
```

Each edge should include:

```ts
type WorkflowEdge = {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  kind: 'data' | 'control' | 'error';
};
```

### 2. Add a node registry

Hard-coded flow-specific arrays should evolve into a registry:

```ts
type NodeDefinition = {
  type: string;
  version: string;
  label: string;
  category: string;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  configSchema: ZodSchema;
  defaultConfig: Record<string, unknown>;
  runtimeAdapters: RuntimeAdapterDefinition[];
};
```

Benefits:

- Node library can be generated from real capabilities.
- Inspector forms can be generated from schemas.
- Validation becomes centralized.
- External plugins can register nodes later.
- Workflow graphs can be migrated across node versions.

### 3. Split the data layer

The current API layer does too much: workflow CRUD, config, local storage fallback, model scanning, storage upload simulation, remote fetch fallback, and face-swap execution.

Split into:

- `workflowRepository.ts`
- `graphRepository.ts`
- `configRepository.ts`
- `runtimeClient.ts`
- `storageClient.ts`
- `localDemoAdapter.ts`
- `remoteApiAdapter.ts`
- `localBridgeAdapter.ts`
- `schemas/`

This will make it much easier to test and replace local demo behavior with real backend behavior.

### 4. Add graph migrations

Workflow graphs will change often. Add versioned migrations immediately:

```ts
migrateWorkflowGraph(graph, fromVersion, toVersion)
```

Without this, early user-created workflows will become unopenable as node definitions evolve.

## UI/UX improvements

### 1. Redesign the dashboard as a project/workflow browser

The homepage should not mount heavy feature workspaces by default. It should show:

- Recent workflows
- Templates
- Runtime health
- Search/filter/sort
- Create workflow
- Import workflow
- Example templates

Individual tools should become either templates or graph nodes.

### 2. Design the workflow editor layout

Recommended editor layout:

- **Top bar:** workflow name, save state, run button, runtime mode, undo/redo, export.
- **Left rail:** node library, templates, search.
- **Center:** graph canvas with grid, minimap, zoom, pan, selection box.
- **Right inspector:** selected node config, validation, docs, model selection.
- **Bottom drawer:** logs, run timeline, artifacts, console, errors.

### 3. Make node creation fast

A strong node editor needs near-zero-friction creation:

- Command palette: `⌘K` / `Ctrl+K` to add nodes.
- Drag from an output port to empty canvas to search compatible next nodes.
- Double-click canvas to open node search.
- Keyboard shortcuts for duplicate, delete, group, comment, run selected.
- Auto-layout and tidy graph actions.

### 4. Improve type feedback

Connections should be visibly typed:

- `image`
- `video`
- `audio`
- `text`
- `json`
- `model`
- `dataset`
- `mask`
- `embedding`
- `control`
- `artifact`

Invalid connections should fail before users release the edge, not after saving.

### 5. Add visual debugging

Users should be able to inspect a run like code debugging:

- Node status: idle, queued, running, success, warning, failed, skipped, cached.
- Input/output previews per node.
- Execution duration badges.
- Error path highlighting.
- Retry from failed node.
- Run diff: compare two executions.

### 6. Upgrade modal accessibility

The modal component should add:

- Focus trap.
- Return focus on close.
- Portal rendering.
- Body scroll lock.
- Overlay click behavior.
- Unique title/description IDs.
- `aria-describedby` support.

## Design system improvements

### 1. Create semantic design tokens

Recommended token groups:

- Background: app, panel, canvas, elevated.
- Text: primary, secondary, muted, inverse.
- Border: subtle, strong, focus, selected.
- Accent: brand, interactive, active.
- State: success, warning, danger, info.
- Node categories: input, model, transform, control, storage, agent, output, debug.

### 2. Reduce inline style usage

Inline theme styles make components harder to standardize and test. Move theme-aware styling into tokens/classes.

### 3. Improve contrast and density

The app should support two density modes:

- **Comfortable:** onboarding, smaller workflows.
- **Compact:** power users, large graphs.

Node editors quickly become dense. Plan for this from the start.

### 4. Use honest empty states

Every panel should answer:

- What is this for?
- What is required to start?
- What happens next?
- Is this running locally, remotely, or in demo mode?

## Performance improvements

### 1. Lazy-load heavy routes and panels

Use route-level and feature-level code splitting:

```tsx
const WorkflowEditor = lazy(() => import('./components/editor/WorkflowEditor'));
```

Do not mount image tools, captioning, LoRA planning, and face-swap panels on the dashboard unless the user opens them.

### 2. Move image/file analysis off the main thread

For large datasets and media-heavy workflows:

- Use Web Workers for image metadata, palette extraction, hashing, and validation.
- Limit preview generation.
- Virtualize file lists.
- Add hard limits and user-facing warnings for memory-heavy operations.

### 3. Avoid repeated plan computation

The LoRA planner recalculates overlapping summaries/plans/payloads in multiple places. Build a single memoized derived state object and use it for UI, export, and preview.

### 4. Improve polling behavior

Coordination polling should avoid setting global loading on every refresh. Add:

- Silent refresh state.
- Backoff when unavailable.
- Last successful update timestamp.
- Optional pause when tab is hidden.

## Runtime and execution improvements

### 1. Use async execution jobs

Long-running workflows need a job model:

```ts
type ExecutionJob = {
  id: string;
  workflowId: string;
  graphVersion: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
  nodeStates: Record<string, NodeExecutionState>;
  artifacts: ExecutionArtifact[];
  logs: ExecutionLogEntry[];
};
```

### 2. Add node-level cache and retry

Node-based workflows need:

- Cache keys based on node config + input artifact hashes.
- Retry policies.
- Timeout policies.
- Cancel support.
- Partial re-run from selected node.

### 3. Define runtime adapters

The same graph should eventually target multiple runtimes:

- Browser local.
- Local bridge.
- Local ComfyUI.
- Remote Vault API.
- Python pipeline runner.
- Agent coordination loop.

Each node definition should declare which runtimes it supports.

## API and persistence improvements

### 1. Add versioned API contracts

Suggested endpoints:

- `GET /api/v1/workflows`
- `POST /api/v1/workflows`
- `GET /api/v1/workflows/:id`
- `PUT /api/v1/workflows/:id`
- `GET /api/v1/workflows/:id/graph`
- `PUT /api/v1/workflows/:id/graph`
- `POST /api/v1/workflows/:id/runs`
- `GET /api/v1/runs/:runId`
- `GET /api/v1/runs/:runId/events`
- `POST /api/v1/runs/:runId/cancel`

### 2. Stop hiding fallback mode

Fallback should be explicit in response metadata:

```ts
type ApiResult<T> = {
  data: T;
  source: 'remote' | 'local-demo' | 'local-fallback';
  remoteAttempted: boolean;
  error?: string;
};
```

### 3. Persist graphs, not just workflow cards

A workflow without a graph is only a folder/card. The database model should include:

- Workflow metadata.
- Graph document.
- Graph version history.
- Runtime config references.
- Last run summary.
- Artifacts.
- Permissions/ownership.

## Security improvements

### 1. Local bridge hardening

The local runtime bridge should add:

- Bearer token or one-time pairing token.
- Restricted CORS origin list.
- Upload size limits.
- File type validation.
- Temp directory cleanup.
- Job expiration.
- Safer multipart parsing.
- Structured audit logs.

### 2. Replace deprecated Python multipart path

The bridge currently uses Python's deprecated `cgi` module. Replace it before Python 3.13 compatibility becomes a problem.

Options:

- Add a small FastAPI/Starlette bridge.
- Use `aiohttp`.
- Use a maintained multipart parser.
- Pin Python version explicitly if staying standard-library-only for now.

### 3. Treat local execution as privileged

A local bridge can access machine-local files and run commands. The UI should make that trust boundary obvious.

Add warnings when users enable local bridge mode:

- What it can access.
- Which command it will run.
- Where outputs are saved.
- Whether remote pages are allowed to call it.

## Testing improvements

### Unit tests

Add tests for:

- Workflow graph schema validation.
- Node registry loading.
- Edge compatibility.
- Graph migration.
- Config update validation, including `apiKey`.
- Local fallback source metadata.
- Local storage unavailable/private-mode failures.

### E2E tests

Add Playwright tests for:

- Create workflow -> open editor -> add node -> connect nodes -> save -> reload.
- Invalid connection shows inline error.
- Runtime mode badge changes after config update.
- Backup/export/restore path.
- Modal focus trap and Escape behavior.
- LoRA export artifact creation.
- Captioning image upload flow.
- Coordination panel unavailable/backoff state.

### Bridge tests

Add Python tests for:

- Missing model directory.
- Valid model scan.
- Path traversal attempts.
- Upload size limits.
- Unsupported command rejection.
- Job cleanup.
- Failed FaceFusion command output.

## File-specific recommendations

| File | Recommendation |
| --- | --- |
| `src/components/features/AdvancedWorkflowCreator.jsx` | Replace placeholder with the first real graph editor shell. Start with add/move/connect/save/load. |
| `src/components/ui/WorkflowPage.jsx` | Mount the real editor, load workflow data by ID, and persist graph edits. The current canvas placeholder should disappear. |
| `src/App.jsx` | Stop mounting heavy feature modules directly on the dashboard. Lazy-load feature workspaces or convert them into workflow templates. |
| `src/api.js` | Split into smaller adapters/repositories. Return source metadata for remote/local/fallback behavior. Add graph CRUD. |
| `src/store.js` | Add slices for graph editor state, selection, node registry, execution, artifacts, and runtime state. |
| `src/validation.js` | Add graph/node/edge schemas. Add `apiKey` to config update schema or remove API key behavior from config. |
| `src/components/ui/ConfigPanel.jsx` | Remove duplicate local config storage. Prefer guided forms over raw JSON as the primary UI. |
| `src/components/ui/Modal.jsx` | Add focus trap, portal, return focus, scroll lock, and unique IDs. |
| `src/components/ui/WorkflowList.jsx` | Add visible run/favorite/pin/delete actions or remove unused API actions until they are real. |
| `src/components/ui/CoordinationPanel.jsx` | Replace constant loading flicker during polling with quiet refresh/backoff. Generate task types from registry instead of hard-coding. |
| `src/components/features/LoRATraining.jsx` | Consolidate repeated derived calculations and add dataset size/count limits. |
| `src/components/features/FaceSwapVideo.jsx` | Add file limits and move execution to async jobs. A short HTTP timeout is not enough for video processing. |
| `run_local_runtime_bridge.py` | Add auth, CORS restrictions, upload limits, temp cleanup, async jobs, and replace deprecated multipart parsing. |
| `tests/e2e/basic-smoke.spec.js` | Expand from shell smoke tests into graph editor, runtime mode, export/restore, and accessibility coverage. |

## Suggested implementation phases

### Phase 1: Graph foundation

- Create graph schema and validators.
- Add node registry.
- Add graph persistence in local fallback.
- Add migrations.
- Add tests for valid/invalid graphs.

### Phase 2: Canvas MVP

- Build `/workflows/:id` editor shell.
- Add node library.
- Add inspector.
- Add connection validation.
- Save/reload graph.
- Add undo/redo.

### Phase 3: Convert existing features into nodes

- Caption node.
- LoRA plan node.
- Face-swap node.
- Model-scan node.
- Storage upload node.
- Export/backup node.

### Phase 4: Execution engine

- Add run jobs.
- Add node execution states.
- Add logs and artifacts.
- Add retry/cancel.
- Add cache.

### Phase 5: Production hardening

- Backend graph persistence.
- User accounts and permissions.
- API key enforcement.
- Local bridge pairing/token flow.
- Template gallery.
- Plugin/node package system.

## Opinionated product call

Do not keep building one-off workflow pages. That path will make Vault Flows feel like a collection of mini apps.

The right direction is to make every capability a node, make the graph the source of truth, and make every panel a supporting surface for graph construction, inspection, or execution.

The fastest credible path is:

1. Ship a minimal graph editor with a tiny node registry.
2. Convert the existing browser-only tools into nodes.
3. Add local graph persistence.
4. Add execution visualization.
5. Only then deepen backend/runtime complexity.

That sequence will move Vault Flows closer to becoming an abstraction over programming languages instead of another dashboard for pre-baked workflows.
