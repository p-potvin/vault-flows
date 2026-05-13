---
run_id: vw-2026-05-13-vf-001
goal: Rebuild vault-flows as a universal visual flow builder SPA (TypeScript, React Flow, Zustand, vaultwares-pipelines backend, Tailwind v4 + vault-themes). Week 1 MVP: open preset → modify param → execute → see result.
approved_by: user
approved_at: 2026-05-13
---

## T1 [ ] Branch setup + old code cleanup
TASK_TYPE: LOCAL
FILE_SCOPE: vault-flows/ (git branch creation, delete src/, backend/, agents/, dispatcher/)
ESTIMATE: 5m
BLOCKS: T2

## T2 [ ] Project scaffold (package.json, vite.config.ts, tsconfig.json, index.css)
TASK_TYPE: CLOUD
FILE_SCOPE: vault-flows/package.json, vault-flows/vite.config.ts, vault-flows/tsconfig.json, vault-flows/src/index.css, vault-flows/src/main.tsx
BLOCKS: T3
BLOCKS_ON: T1
ESTIMATE: 20m

## T3 [ ] Node type system + Zustand store
TASK_TYPE: CLOUD
FILE_SCOPE: vault-flows/src/nodes/types.ts, vault-flows/src/nodes/registry.ts, vault-flows/src/store/flowStore.ts
BLOCKS: T4, T5, T6, T7
BLOCKS_ON: T2
ESTIMATE: 30m

## T4 [ ] React Flow canvas + 5 custom node renderers
TASK_TYPE: CLOUD
PARALLEL: T5, T6, T7
FILE_SCOPE: vault-flows/src/canvas/FlowCanvas.tsx, vault-flows/src/canvas/nodes/InputNode.tsx, vault-flows/src/canvas/nodes/OutputNode.tsx, vault-flows/src/canvas/nodes/LLMNode.tsx, vault-flows/src/canvas/nodes/TransformNode.tsx, vault-flows/src/canvas/nodes/DisplayNode.tsx
BLOCKS: T8
BLOCKS_ON: T3
ESTIMATE: 45m

## T5 [ ] API client + execution runner
TASK_TYPE: CLOUD
PARALLEL: T4, T6, T7
FILE_SCOPE: vault-flows/src/api/client.ts, vault-flows/src/execution/runner.ts
BLOCKS: T8
BLOCKS_ON: T3
ESTIMATE: 30m

## T6 [ ] i18n setup (EN/FR strings)
TASK_TYPE: LOCAL
PARALLEL: T4, T5, T7
FILE_SCOPE: vault-flows/src/i18n/index.ts, vault-flows/src/i18n/en.ts, vault-flows/src/i18n/fr.ts
BLOCKS: T8
BLOCKS_ON: T2
ESTIMATE: 20m

## T7 [ ] Preset data files (4 presets across 3 domains)
TASK_TYPE: ASYNC
PARALLEL: T4, T5, T6
FILE_SCOPE: vault-flows/src/presets/index.ts, vault-flows/src/presets/data/blog-post-drafter.json, vault-flows/src/presets/data/lesson-plan-builder.json, vault-flows/src/presets/data/meeting-summary.json, vault-flows/src/presets/data/image-gen-basic.json
BLOCKS: T8
BLOCKS_ON: T3
ESTIMATE: 30m
ASYNC_PROMPT: |
  Branch: rewrite/spa of vault-flows repo at C:\Users\Administrator\Desktop\Github Repos\vault-flows
  Run ID: vw-2026-05-13-vf-001 · Task ID: T7

  Create 4 preset JSON files for vault-flows, a universal visual flow builder SPA.

  Node types available: input | output | llm | transform | display
  FlowNode schema: { id, type, label, position: {x,y}, params: Record<string,unknown>, preset?: string }
  FlowEdge schema: { id, source, sourceHandle, target, targetHandle }
  Flow schema: { id, name, nodes: FlowNode[], edges: FlowEdge[], phase: number, createdAt, updatedAt }
  Preset schema: { id, name, nameKey, domain, description, descriptionKey, flow: Flow }

  Create these files on branch rewrite/spa:

  1. src/presets/data/blog-post-drafter.json — domain: "writing"
     A 3-step flow: [Input: topic] → [LLM: expand to outline] → [LLM: write draft] → [Display: result]

  2. src/presets/data/lesson-plan-builder.json — domain: "education"
     A flow: [Input: subject + grade] → [LLM: generate objectives] → [LLM: build lesson plan] → [Display]

  3. src/presets/data/meeting-summary.json — domain: "business"
     A flow: [Input: raw meeting notes] → [LLM: extract action items] → [LLM: format summary] → [Display]

  4. src/presets/data/image-gen-basic.json — domain: "image"
     A flow: [Input: prompt + style] → [Transform: format ComfyUI params] → [Output: ComfyUI job]

  Also create src/presets/index.ts that exports a typed Preset[] array importing all 4 JSON files.

  Position nodes left-to-right with 250px horizontal spacing. Use realistic default params (e.g. model: "llama3", temperature: 0.7).
  Open a PR with branch name jules/vw-2026-05-13-vf-001/T7.

## T8 [ ] App shell + PresetLibrary UI + ThemePicker
TASK_TYPE: CLOUD
FILE_SCOPE: vault-flows/src/App.tsx, vault-flows/src/ui/PresetLibrary.tsx, vault-flows/src/ui/PresetCard.tsx, vault-flows/src/ui/ThemePicker.tsx, vault-flows/src/ui/NodeParamPanel.tsx
BLOCKS: T9
BLOCKS_ON: T4, T5, T6, T7
ESTIMATE: 45m

## T9 [ ] Build verification + NSSM service registration
TASK_TYPE: LOCAL
FILE_SCOPE: vault-flows/ (npm run build, nssm commands only)
BLOCKS_ON: T8
ESTIMATE: 10m
