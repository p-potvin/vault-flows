## 2024-05-14 - React App Rendering Bottleneck
**Learning:** The `filtered` array inside `App.jsx` was being re-created on every render pass, which, although not breaking the app, is an unnecessary recalculation. Moreover, static arrays like `categories` were declared inside the component, leading to re-allocation every render.
**Action:** Always extract static configurations or arrays outside the component scope if they don't depend on props/state. Use `useMemo` for derived data like filtered lists to avoid redundant calculations when unrelated state (like UI panels) changes.
## 2024-05-18 - React List Rendering Bottlenecks
**Learning:** In React, typing into a controlled input inside a modal (like the "Edit Workflow" modal) updates state in the parent component. This causes the entire parent component to re-render. If a large list (like `workflows.map`) is rendered inline within that parent component, React will destroy and recreate every single list item element on every single keystroke, causing significant input lag.
**Action:** Always wrap large list mappings in `useMemo` when they sit alongside fast-updating state (like form inputs), and ensure any callback functions passed to those list items (like `openEdit`) are wrapped in `useCallback` to maintain referential stability.
## 2026-04-20 - Redundant Local Storage Parsing
**Learning:** Local fallback functions (like in `backupWorkflows`) were calling expensive local storage read/parse functions (`getWorkflows()`) multiple times within the same execution block to build a single payload.
**Action:** Always cache the result of local storage readers in a local variable if the result is needed multiple times within the same function or fallback block.
