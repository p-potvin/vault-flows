Intent: Add new Semantic Knowledge Ingestion Pipeline flow for daily task

Created a new workflow based on the "Natural Language & Intelligence" category, focusing on RAG and vector database ingestion.

Constraint: Must act as the scheduled job itself to fulfill the daily workflow generation task manually instead of automating it.
Rejected: Automating through CI/CD | User explicitly directed to act as the scheduled job.
Confidence: high
Scope-risk: narrow
Directive: Ensure new default workflows are mirrored in e2e tests to maintain UI test stability.
Tested: Verified frontend UI e2e tests pass with the new default workflow element visible.
Not-tested: Backend ingestion execution implementation details for the newly listed skill.
