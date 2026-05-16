
## 🚨-02-28 - Test Globbing and CI Package Manager Drift
**Symptom Pattern:** `pnpm test` triggers errors related to test runners like missing `vitest` in cross-cutting dependencies and `MODULE_NOT_FOUND`.
**Root Cause:** The `node --test` command implicitly globs both `.test.js` and `.test.ts` indiscriminately, including submodule tests that are expected to be run by entirely different tooling (vitest). Moreover, CI pipelines drift by using `npm` commands inside a `pnpm` workspace, leading to unexpected behaviors.
**Prevention:** Always restrict `node --test` to exact directories (e.g. `node --test "src/**/*.test.js"`) and enforce `pnpm/action-setup` explicitly in GitHub Actions when `pnpm-lock.yaml` is the source of truth.

## 🚨-02-28 - E2E Tests failing when no tests found
**Symptom Pattern:** `pnpm run test:e2e` fails when `tests/e2e/` is empty or missing, returning `Error: No tests found`. This breaks the CI pipelines.
**Root Cause:** Playwright expects tests in `testDir` (`tests/e2e`) as specified in `playwright.config.js`. If there are none, it throws an error.
**Prevention:** Include a dummy smoke test or verify the basic UI interactions when creating new pipelines. We created `tests/e2e/basic-smoke.spec.js` which performs some basic `page.goto` testing to fix the failure. `vitest.config.ts` was also updated to explicitly exclude `tests/e2e/` so `vitest` doesn't pick up playwright tests.

## 🚨-02-28 - Vite build fails on missing Node typings
**Symptom Pattern:** `pnpm run build` fails with TS errors indicating missing modules `node:fs`, `node:path`, `process`, and `__dirname` in `vite.config.ts`.
**Root Cause:** The `vite.config.ts` utilizes Node APIs for configuration resolution, but `@types/node` is missing from the devDependencies, causing TypeScript compilation (which is part of the build step: `tsc -b && vite build`) to fail.
**Prevention:** Always ensure `@types/node` is installed as a `devDependency` (`pnpm install -D @types/node`) when configuring Vite with Node built-ins.
