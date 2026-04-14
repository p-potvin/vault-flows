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

## Phase 4: Complete AI workflow features

- Replace demo captioning with actual caption/tag generation.
- Replace simulated LoRA progress with queued training execution and artifact retrieval.
- Decide whether the Python multi-agent system is part of the product or separate internal tooling.
- Add end-to-end tests for real backend-backed flows.
