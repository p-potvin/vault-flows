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

Intent: Add Multimodal Video Interrogation Pipeline flow

Added a new workflow "Multimodal Video Interrogation Pipeline" to `vaultwares-pipelines` and `vault-flows` as part of a scheduled daily flow generation task. The flow targets the "Natural Language & Intelligence" category, focusing on Multimodal VQA for detailed image/video interrogation (captioning + logic).

Constraint: Must act as the scheduled job itself to fulfill the daily workflow generation task manually instead of automating it.
Rejected: Automating through CI/CD | Reason: Explicit instruction to act as the scheduled job.
Confidence: high
Scope-risk: narrow
Directive: Ensure new default workflows are mirrored in e2e tests to maintain UI test stability.
Tested: Verified e2e UI visibility tests pass and SKILL.md was created.
Not-tested: End-to-end execution of the flow using actual local models.

Intent: Implement local bridge security and rate limiting

Addressed Task 11c from TASKS.md. Added a simple rate limiting mechanism to `VaultFlowsBridgeHandler` to prevent abuse. Also mitigated a path traversal vulnerability in `run_faceswap_job` by using `Path.resolve().is_relative_to()` instead of `os.path.commonpath`.

Constraint: Adhere to standard Python library and maintain single-file simplicity for the bridge.
Rejected: Advanced rate limiting with Redis | Reason: The bridge needs to be dependency-free and machine-local.
Confidence: high
Scope-risk: narrow
Directive: Ensure all filesystem paths in the local bridge continue to use `.resolve().is_relative_to()` for boundary checks.
Tested: Verified script builds without syntax errors and runs successfully in validation checks.
Not-tested: High volume concurrent requests to test the rate limiting under load.
