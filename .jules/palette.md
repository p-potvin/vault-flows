
## 2025-04-19 - Improved Modal Accessibility and UX
**Learning:** Adding the appropriate ARIA attributes `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` combined with keyboard navigation (e.g. listening for the `Escape` key) makes standard React modals much more accessible to screen readers and keyboard users. React's `useEffect` hook correctly manages adding and removing the keydown event listener.
**Action:** When creating or modifying modals or dialogs, ensure they include semantic ARIA roles and proper keyboard accessibility for dismissing them.
## 2026-04-20 - Inconsistent Button Disabled States
**Learning:** Found a recurring usability issue where buttons in older panels (like BackupRestorePanel and ExportPanel) used the `disabled` attribute but lacked visual styling (e.g., `opacity-50`, `cursor-not-allowed`). This prevented users from understanding that actions were unavailable or currently processing.
**Action:** Applied standard `disabled:opacity-50 disabled:cursor-not-allowed` classes and dynamic loading text (`{loading ? 'Processing...' : 'Submit'}`) to improve feedback.
