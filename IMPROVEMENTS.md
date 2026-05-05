# Vault Flows Improvements

## Product Direction Note

Vault Flows should lead unregistered users through a preset-first path:

- Show a curated catalog of preset workflows immediately.
- Let guests inspect a preset, modify a copy, or create a new flow.
- Send every modify/create action into the node-based editor.
- After authentication, land users on a personal workspace with their own flows, favorited presets, and favorited community flows.

This matters before editor work starts because presets should become graph templates, not disconnected demo panels. The editor, workflow list, persistence model, and future account surface should all treat workflows as reusable graph documents.

## Current First-Phase Priority

Build a real graph foundation before adding more one-off workflow tools:

- Typed workflow graph schema.
- Node registry with reusable node definitions.
- Preset workflows represented as starter graphs.
- `/workflows/:id` editor route that can load, edit, and save graph documents.
- Clear path for copying presets into personal flows once authentication exists.

## Follow-Up Areas

- Add a real account/auth model before separating guest, personal, and community data.
- Define backend graph persistence so local storage and API responses use the same contract.
- Add execution semantics for graph traversal, validation, run state, logs, and node-level errors.
- Convert existing Image Captioning, LoRA Prep, Face Swap, Backup, Export, Storage, Config, and Coordination panels into reusable node types.
