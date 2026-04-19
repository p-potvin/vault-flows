## 2024-05-14 - React App Rendering Bottleneck
**Learning:** The `filtered` array inside `App.jsx` was being re-created on every render pass, which, although not breaking the app, is an unnecessary recalculation. Moreover, static arrays like `categories` were declared inside the component, leading to re-allocation every render.
**Action:** Always extract static configurations or arrays outside the component scope if they don't depend on props/state. Use `useMemo` for derived data like filtered lists to avoid redundant calculations when unrelated state (like UI panels) changes.
