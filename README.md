# Vault Flows

Vault Flows is a Vite + React frontend for managing workflow definitions, backup and export operations, storage uploads, and a set of AI-adjacent workflow demos. The repository also contains a Python Redis-based multi-agent coordination prototype under `agents/` and `vaultwares_agentciation/`.

## Current state

- The web app is the primary runnable surface for Vercel deployment.
- The Python agent subsystem is present, but it is still mostly simulation and coordination scaffolding rather than production task execution.
- The repo previously depended on an external backend API for core workflow operations. The frontend now supports a local demo/fallback mode when that backend is missing or unreachable.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

## Local runtime bridge

The Vercel-hosted UI can manage local execution, but it cannot scan or execute models directly from your Windows filesystem without a machine-local helper.

Use the bundled bridge when you want to:

- scan a local ComfyUI model directory such as `D:\comfyui\resources\comfyui\models`
- expose a model catalog to the browser UI
- run the bundled image-to-video face-swap flow against local tools such as FaceFusion

Start it with:

```bash
npm run bridge:local
```

The Config panel exposes the matching `Local bridge URL`, `Local ComfyUI URL`, `Model Directory`, and `FaceFusion Command` fields.

## Environment

- `VITE_API_URL`
  - Leave empty to run the frontend in local demo/fallback mode.
  - Set this to a real backend base URL to use the remote API with automatic local fallback when the API is unavailable.

## Verification

```bash
npm run lint
npm run build
npm run test:e2e
python -m py_compile run_local_runtime_bridge.py
```

## Repo notes

- `TODO.md` is the implementation backlog and current execution tracker.
- `ROADMAP.md` records the larger phased direction.
- `.omx/plans/` contains assessment and execution plans produced during repo maintenance.
