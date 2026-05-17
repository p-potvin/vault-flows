Intent: Add new Semantic Knowledge Ingestion Pipeline flow for daily task

Created a new workflow based on the "Natural Language & Intelligence" category, focusing on RAG and vector database ingestion.

Constraint: Must act as the scheduled job itself to fulfill the daily workflow generation task manually instead of automating it.
Rejected: Automating through CI/CD | User explicitly directed to act as the scheduled job.
Confidence: high
Scope-risk: narrow
Directive: Ensure new default workflows are mirrored in e2e tests to maintain UI test stability.
Tested: Verified frontend UI e2e tests pass with the new default workflow element visible.
Not-tested: Backend ingestion execution implementation details for the newly listed skill.

Intent: Add Legal Clause Comparison flow

Added a new workflow "Legal Clause Comparison" to `vaultwares-pipelines` and `vault-flows` as part of a scheduled daily flow generation task. The flow targets the "Specialized & Niche" category, utilizing specialized subagents for extracting and comparing legal clauses, while strictly relying on local models.

Constraint: Must adhere to local models constraint and VaultWares agentciation formatting (Lore Commit Protocol).
Rejected: Integrating third-party APIs for extraction | Reason: Explicit instruction to use local models only.
Confidence: high
Scope-risk: narrow
Directive: Ensure any new flows similarly follow the Lore Commit Protocol and specify the local model paths if applicable.
Tested: Verified e2e UI visibility tests pass and SKILL.md was created.
Not-tested: End-to-end execution of the flow using actual local models.

Intent: Secure path traversal vulnerability in local runtime bridge

Addressed Task 11c regarding rate limiting and local bridge security. Refactored `run_local_runtime_bridge.py` path resolution to prevent directory escape by validating that `saveDirectory` resolves strictly within `JOB_ROOT`. Updated `README.md` to reflect recently shipped features.

Constraint: Avoid introducing complex dependencies; use standard library `pathlib` for explicit boundary verification.
Rejected: Using `os.path.commonpath` | Insufficiently secure and prone to semantic errors when dealing with resolved vs unresolved symlinks compared to `pathlib.Path.is_relative_to`.
Confidence: high
Scope-risk: narrow
Directive: Ensure all future local file access or uploads validate resolved paths strictly against the intended base directory.
Tested: Verified script syntax using `ruff`.
Not-tested: End-to-end execution of a faceswap job triggering the new boundary check under malicious path conditions.

Intent: Assign rate-limiting and API key propagation tasks to myself

Update TASKS.md to reflect that tasks 11a and 11c are now in progress and assigned to myself per user instructions.

Constraint: I must act directly on user instructions to assign tasks to myself, rejecting the previous delegation plan to "kraftwerk".
Rejected: Delegating tasks to "kraftwerk" | User explicitly instructed to assign to myself.
Confidence: high
Scope-risk: narrow
Directive: Always ensure task trackers are updated when task assignment changes.
Tested: Verified TASKS.md updates visually.
Not-tested: N/A
Intent: Add Layout-Aware Document Intelligence Pipeline flow

Added a new workflow "Layout-Aware Document Intelligence Pipeline" to `vaultwares-pipelines` and `vault-flows` as part of a scheduled daily flow generation task. The flow targets the "Utility & Structural" category, focusing on form extraction and layout-aware PDF analysis using specialized subagents and local models.

Constraint: Must act as the scheduled job itself to fulfill the daily workflow generation task manually instead of automating it.
Rejected: Automating through CI/CD | Reason: Explicit instruction to act as the scheduled job.
Confidence: high
Scope-risk: narrow
Directive: Ensure new default workflows are mirrored in e2e tests to maintain UI test stability and document the specific subagent constraints in the skill definition.
Tested: Verified e2e UI visibility tests pass and SKILL.md was created.
Not-tested: End-to-end execution of the flow using actual local models or parsing real documents.

Intent: Add Multimodal Video Interrogation Pipeline flow

Added a new workflow "Multimodal Video Interrogation Pipeline" to `vaultwares-pipelines` and `vault-flows` as part of a scheduled daily flow generation task. The flow targets the "Natural Language & Intelligence" category, focusing on Multimodal VQA for detailed image/video interrogation (captioning + logic).

Constraint: Must act as the scheduled job itself to fulfill the daily workflow generation task manually instead of automating it.
Rejected: Automating through CI/CD | Reason: Explicit instruction to act as the scheduled job.
Confidence: high
Scope-risk: narrow
Directive: Ensure new default workflows are mirrored in e2e tests to maintain UI test stability.
Tested: Verified e2e UI visibility tests pass and SKILL.md was created.
Not-tested: End-to-end execution of the flow using actual local models.
Intent: Add semantic label mappings and explicit focus-visible states to interactive components to resolve accessibility issues in WorkflowList and FlowRuntimePanel.
Narrative: When analyzing components under the "Palette" persona, it was discovered that dynamic select elements and several custom navigation buttons lacked explicitly assigned \`htmlFor\` mappings and visible focus indicators. These issues severely impacted screen reader operability and keyboard navigation. Using existing design tokens (\`focus-visible:ring-vault-500\`), these interactions were normalized.
Constraint: No custom CSS added, relied purely on existing Tailwind `focus-visible` utility classes and semantic HTML attributes.
Rejected: Modifying generic element types to native interactive types, as standardizing current patterns required fewer lines of code and lowered regression risk.
Confidence: 100
Scope-risk: Low
Directive: Palette UX focus
Tested: Yes, via Playwright visual screenshot and `node --test` suite.
Not-tested: Screen reader manual auditory test.
Intent: Fix GitHub Actions CI pipeline failing on strict lockfile validation by swapping npm for pnpm.
Narrative: The GitHub Actions `build-and-test` job failed because it was executing `npm ci` in a repository strictly managed by `pnpm`. `npm ci` choked on missing packages since `package-lock.json` was out of sync with `pnpm-lock.yaml`. I updated the `.github/workflows/ci.yml` pipeline to install `pnpm/action-setup@v3`, set the Node.js action cache to `pnpm`, and replaced all instances of `npm run` and `npx` with their `pnpm` equivalents (`pnpm run`, `pnpm exec`). The tests were then run locally using `pnpm test` to ensure local stability.
Constraint: Maintain existing Node.js v20 runtime context in CI.
Rejected: Generating a new `package-lock.json` via `npm install` and committing it, because the repository is clearly standardized around `pnpm` (`pnpm-lock.yaml` is present, `eslint` ran via `pnpm`).
Confidence: 100
Scope-risk: Low
Directive: CI Pipeline Repair
Tested: Local unit tests via `pnpm test`.
Not-tested: End-to-end cloud environment deployment triggers.
Intent: Add Skateboarding Trick Analysis & Slow-Mo Generation flow
Narrative: Created a new workflow based on the Video / Action Sports category. Included pose tracking, trick classification, and AI-driven frame interpolation. Updated the frontend registry, backend `video_agent.py` with the new skill handler, and added visibility checks to e2e smoke tests.
Constraint: Act as the scheduled job itself to fulfill the daily workflow generation task manually instead of automating it.
Rejected: Automating through CI/CD | Reason: Explicit instruction to act as the scheduled job.
Confidence: high
Scope-risk: narrow
Directive: Ensure new default workflows are mirrored in e2e tests to maintain UI test stability.
Tested: Verified e2e UI visibility tests pass and SKILL.md was created.
Not-tested: End-to-end execution of the flow using actual local models.
