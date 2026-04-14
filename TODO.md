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

## Later

- backend-implementation [ ] Build or connect the missing backend service instead of relying on local fallback mode.
- feature-completion [ ] Replace heuristic captioning and planning-only LoRA flows with real inference/training orchestration.
- python-agent-hardening [ ] Turn the Redis multi-agent prototype into a real tested service layer or separate it from the deployable frontend.
- duplication-cleanup [ ] Eliminate the duplicated `vaultwares-agentciation/` and `vaultwares_agentciation/` package trees.
