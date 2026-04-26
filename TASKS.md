# TASKS.md - Vault Flows Project

**Dispatch Rules Reminder (must be reviewed before starting any task):**

- Review the entire ROADMAP.md + TODO.md + AI_Flows_Categories.md before starting any task to ensure alignment with project goals and dependencies.
- All tasks are assigned to a single agent.
- Tasks use numbers: `1 [ ] Task`
- Subtasks use letters: `1a [ ] Subtask`
- Status indicators: `[ ]` (Free), `[~]` (In Progress), `[x]` (Finished)
- Agents in `RELAXING` state will be assigned the next available main task.
- Agents in `WAITING_FOR_INPUT` are locked until PRs are merged by human intervention and are manually reset.

**Project Vision Alignment**  
Make vault-flows a **general-purpose node-based workflow builder** (ComfyUI-like but far more diverse) that lets users create *any* workflow, plug in local or server AI models (via local bridge or vaultwares-pipelines API), visualize step-by-step execution, and run them flexibly. Flows are stored/ executed on the backend API; frontend is pure creation + monitoring UI.

---

## Phase 0: Dispatcher Expansion (New Foundation – High Priority)

**Goal**: Evolve the current agent system (run_coordinated_system.py, agents/, etc.) into a robust, observable multi-agent dispatcher using Redis for queueing/state and a real-time GUI for monitoring.

1 [ ] Implement Redis-backed Dispatcher Core
   1a [ ] Add Redis (BullMQ or custom queue) for task distribution, agent state, and progress tracking
   1b [ ] Refactor assign_tasks.py / run_coordinated_system.py to use Redis streams / pub-sub for agent handoff
   1c [ ] Store task history, agent status (RELAXING / WAITING_FOR_INPUT / WORKING), and subtask results in Redis
   1d [ ] Add locking mechanisms to prevent duplicate task assignment

2 [ ] Build Dispatcher Monitoring GUI
   2a [ ] Create a new React page `/dispatcher` (or integrate into existing Config/Storage panel)
   2b [ ] Real-time dashboard: list of all agents/sub-agents, current task, status, progress bars, logs
   2c [ ] Use WebSocket (or Server-Sent Events) connected to backend for live updates
   2d [ ] Add controls: pause/resume/cancel tasks, reassign, view full task tree
   2e [ ] Visual agent dependency graph (simple xyflow mini-canvas for agent relationships)

3 [ ] Integrate Dispatcher with Existing Agent System
   3a [ ] Update AGENTS.md with new Redis-based workflow
   3b [ ] Add health checks and auto-recovery for stuck agents
   3c [ ] Ensure backward compatibility with current local Python scripts

---

## Phase 1: Core Node-Based Workflow Builder (The Big Missing Piece)

**Goal**: Deliver the visual “ComfyUI but more diverse” experience.

4 [ ] Add xyflow (React Flow successor) to the project
   4a [ ] Install `@xyflow/react @xyflow/core` + Zustand for graph state
   4b [ ] Create `/builder` route with left palette, central canvas, right inspector
   4c [ ] Implement basic drag & drop, connection handling, undo/redo, zoom/pan

5 [ ] Define Core Node Types & Palette
   5a [ ] AI Model Node (supports local via bridge OR server models)
   5b [ ] Data/Transform, Logic (Conditional, Loop), Output, Input nodes
   5c [ ] Custom Snippet nodes (safe JS/Python via backend)
   5d [ ] Non-AI nodes: Webhook, File I/O (bridge), API Call, Human Approval
   5e [ ] Categorize palette matching AI_Flows_Categories.md + new general categories

6 [ ] Flow Serialization & Backend Integration
   6a [ ] Define stable JSON schema (nodes + edges + metadata + version)
   6b [ ] POST/PUT flows to vaultwares-pipelines API
   6c [ ] Load existing flows into canvas (with backward compatibility for old step lists)

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

11 [ ] Security & Production Readiness
    11a [ ] API key / auth propagation from frontend to backend
    11b [ ] Sandboxing for custom code nodes
    11c [ ] Rate limiting and local bridge security (filesystem exposure)

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

**Next Available Task Assignment**: Agents in RELAXING state should pick the lowest unassigned main task after reviewing ROADMAP.md.
