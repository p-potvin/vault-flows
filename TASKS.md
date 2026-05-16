---
run_id: vw-2026-05-13-vf-001
goal: Rebuild vault-flows as a universal visual flow builder SPA (TypeScript, React Flow, Zustand, vaultwares-pipelines backend, Tailwind v4 + vault-themes). Week 1 MVP: open preset → modify param → execute → see result.
approved_by: user
approved_at: 2026-05-13
---

## Phase 2: Execution Engine & Live Monitoring

7 [ ] Backend DAG Executor (vaultwares-pipelines)
   7a [ ] Implement topological sort + async execution using networkx or similar
   7b [ ] Add WebSocket real-time node status updates
   7c [ ] Support partial execution (run from specific node, pause/resume)

8 [ ] Frontend Execution View
   8a [ ] Dedicated `/execute/{flowId}` page with live canvas overlay (nodes highlight as they run)
   8b [ ] Per-node logs, outputs, timing
   8c [ ] Manual triggers, step-by-step controls, artifact gallery
   8d [ ] Progress summary and downloadable results

---

## Phase 3: Model Integration & Diversity

9 [ ] Enhance Local Bridge & Model Catalog
   9a [ ] Expose full local model catalog (Ollama, ComfyUI, LM Studio, FaceFusion, etc.) directly in node palette
   9b [ ] Hybrid model selector (local vs server) with fallback logic
   9c [ ] Auto-scan improvements and caching

10 [ ] Expand Workflow Diversity
    10a [ ] Agent/RAG pipelines, multi-modal chains, business automation nodes
    10b [ ] User-defined custom node types (form-based or code)
    10c [ ] Import/export flows (JSON + shareable links)

---

## Phase 4: Polish, Security & Release

11 [~] Security & Production Readiness
    11a [~] API key / auth propagation from frontend to backend
    11b [ ] Sandboxing for custom code nodes
    11c [~] Rate limiting and local bridge security (filesystem exposure)

12 [ ] Testing & Documentation
    12a [ ] Expand Playwright e2e for builder + execution flows
    12b [ ] Update README.md, ROADMAP.md, and add Builder user guide
    12c [ ] Performance testing for large graphs

13 [ ] Deployment & Monitoring
    13a [ ] Vercel + Render alignment with new features
    13b [ ] Add analytics/telemetry (opt-in) for usage patterns

---

**Current Status Notes** (auto-update via agents):

- Dispatcher expansion is new foundational work to support scalable agent tasks.
- Node builder is the #1 gap to reach full vision.
- All tasks must maintain local-first + remote API hybrid capability.
