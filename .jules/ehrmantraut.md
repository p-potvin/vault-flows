
## 🚨-02-28 - Test Globbing and CI Package Manager Drift
**Symptom Pattern:** `pnpm test` triggers errors related to test runners like missing `vitest` in cross-cutting dependencies and `MODULE_NOT_FOUND`.
**Root Cause:** The `node --test` command implicitly globs both `.test.js` and `.test.ts` indiscriminately, including submodule tests that are expected to be run by entirely different tooling (vitest). Moreover, CI pipelines drift by using `npm` commands inside a `pnpm` workspace, leading to unexpected behaviors.
**Prevention:** Always restrict `node --test` to exact directories (e.g. `node --test "src/**/*.test.js"`) and enforce `pnpm/action-setup` explicitly in GitHub Actions when `pnpm-lock.yaml` is the source of truth.
