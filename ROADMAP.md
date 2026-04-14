# Vault Flows Roadmap

## Phase 1: Stabilize the frontend shell

- Restore a working build.
- Eliminate missing imports and broken panel wiring.
- Make the app usable without an external backend.
- Document the runtime modes and verification commands.

## Phase 2: Ship a deployable demo

- Persist workflows/config/uploads locally so the app behaves consistently on Vercel.
- Improve workflow CRUD and user feedback paths.
- Replace obvious placeholder flows with demo-safe, honest implementations.
- Expand Playwright coverage to protect the deployable surface.

## Phase 3: Reconnect to a real backend

- Define the backend API contract expected by the frontend.
- Implement or connect workflow, config, storage, and execution endpoints.
- Add environment-aware remote/local health visibility in the UI.
- Validate remote mode against a real non-local deployment target.


## Phase 4: Core Expansion & Web-Exposure (Current)
- [ ] **Security & Persistence (API)**
	- Integrate PostgreSQL database for user configs, datasets, and workflows.
	- Implement Account Creation (Username, Password, Optional Email).
	- Implement comprehensive API Key system for all endpoints.
- [ ] **UI & Architecture Overhaul**
	- Refactor routing: Dedicated pages per workflow.
	- Advanced Workflow Builder (branching, node-based logic, granular options).
- [ ] **Advanced Image Manipulation**
	- Integrate FaceFusion directly into the UI (resolve blurry preview issues).
	- Batch image editing capabilities (beyond React crop widget).
	- Face Enhancer button (GFPGAN/CodeFormer integrations).
	- Photoshop-style presets (levels, color profiles).
	- Mask creation widget (brush & polygon lasso) for inpainting/outpainting.
- [ ] **LoRA & Dataset Orchestration (API)**
	- Direct LoRA training execution on backend via strict OOM-safe defaults.
	- Fine-tuning dials and email completion notifications.
	- Real captioning mechanism (tags + natural language) with VLM auto-tagger support.
	- Save and load reusable datasets from the database.
