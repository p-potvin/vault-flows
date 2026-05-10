Add Legal Clause Comparison flow

Added a new workflow "Legal Clause Comparison" to `vaultwares-pipelines` and `vault-flows` as part of a scheduled daily flow generation task. The flow targets the "Specialized & Niche" category, utilizing specialized subagents for extracting and comparing legal clauses, while strictly relying on local models.

Constraint: Must adhere to local models constraint and VaultWares agentciation formatting (Lore Commit Protocol).
Rejected: Integrating third-party APIs for extraction | Reason: Explicit instruction to use local models only.
Confidence: high
Scope-risk: narrow
Directive: Ensure any new flows similarly follow the Lore Commit Protocol and specify the local model paths if applicable.
Tested: Verified e2e UI visibility tests pass and SKILL.md was created.
Not-tested: End-to-end execution of the flow using actual local models.