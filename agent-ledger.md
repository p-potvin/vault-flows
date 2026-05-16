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

Intent: Enhance local runtime bridge security against path traversal

Updated `run_local_runtime_bridge.py` to accept an `--allowed-models-dir` CLI argument and explicitly verify that any requested `models_dir` is safely contained within this base directory using `.resolve().is_relative_to(...)`. This addresses task 11c from TASKS.md to mitigate filesystem exposure.

Constraint: Must secure the local bridge while maintaining functionality and avoiding new external dependencies.
Rejected: Complex path parsing | Reason: Python's native `pathlib.Path.resolve().is_relative_to()` is robust and standard library.
Confidence: high
Scope-risk: narrow
Directive: Ensure new features handling user-supplied paths also enforce strict base directory containment checks.
Tested: Verified via curl requests that paths attempting to escape the allowed directory are rejected with a 400 Bad Request, while legitimate paths succeed.
Not-tested: Windows specific drive letter traversal edge cases (though `.resolve()` generally handles these correctly).
