# Vault Flows TODO

Current execution focus is moving the app from a broken backend-dependent shell to a deployable Vercel preview with an honest browser-local fallback mode.

## Done

- assessment-state [x] Read the markdown corpus, `.github/`, and OMX state to identify the real repo status.
- assess-api [x] Confirmed the frontend is not reliably plugged into a working backend contract.
- assess-build [x] Confirmed `npm run lint` passes and `npm run build` initially failed on missing API exports.
- doc-bootstrap [x] Restored `README.md` and `.env.example` so the repo has an actual entrypoint and environment contract.
- local-api-fallback [x] Built a local-resilient data layer so the frontend works even when `VITE_API_URL` is unset or broken.
- panel-wiring [x] Wired workflow, config, and storage panels to the new data layer and removed missing-import build failures.
- feature-honesty [x] Replaced obvious placeholder behavior with honest browser-local captioning and LoRA planning utilities.
- verification-sweep [x] Re-ran lint, build, Playwright, and deployed-preview browser checks after wiring changes.
- vercel-preview [x] Created a Vercel preview deployment for the current workspace state.

## In Progress

- remote-api-contract [~] Define the real backend contract cleanly enough that the browser-local adapter can be replaced without UI churn.
- deploy-target-alignment [~] Reconcile the repo’s Render automation with the new Vercel preview/deploy path.

## Next

- workflow-actions [ ] Finish wiring any remaining exposed workflow actions that still rely on dead UI paths.
- storage-providers [ ] Decide whether provider-specific uploads remain demo metadata only or should move behind a real API contract.
- config-contract [ ] Tighten the configuration schema and UI around remote/local API mode visibility.
- e2e-depth [ ] Expand Playwright coverage further to cover restore paths, image captioning interactions, and LoRA export artifacts.
- vercel-deploy [ ] Claim and/or promote the preview deployment once the target Vercel project and ownership are finalized.


### Web-Exposure & Security
- [x] Setup PostgreSQL schema (Users, Workflows, Datasets, Configs). (API)
- [ ] Build User Registration & Authentication flow. (API)
- [x] Implement API Key generation, validation, and middleware protection. (API)

### Workflows & Core UI
- [x] Refactor React Router to support dedicated workflow pages (`/workflows/:id`).
- [ ] Create `LIBRARIES.md` outlining image manipulation libraries (Fabric.js, CamanJS, OpenCV, etc).
- [ ] Build the Advanced Workflow Creator interface with expanded settings.

### Image Processing & Editing
- [ ] Debug and fix FaceFusion blurry preview (check downscaling / missing restoration models).
- [ ] Build Dataset Manager UI (save, load, batch edit, bulk crop/resize).
- [ ] Implement Mask Creation Widget (fabric.js) for localized inpainting/outpainting.
- [ ] Add Face Enhancer action (trigger GFPGAN/CodeFormer pipeline).
- [ ] Implement color profile and level adjustment presets in the canvas.

### Training & Captioning
- [ ] Build Advanced Captioning UI (structural tags + natural language text areas).
- [ ] Integrate auto-captioning backend mechanism (WD14 Tagger / JoyCaption). (API)
- [ ] Connect LoRA training trigger to backend script execution. (API)
- [ ] Implement strict LoRA training validation defaults to prevent VRAM OOM exceptions. (API)
- [ ] Integrate email dispatcher for training completion alerts. (API)
