## 2024-05-24 - File Input Accessibility & Disabled Button Tooltips
**Learning:** React `<input type="file">` elements without explicit labels are inaccessible to screen readers. Additionally, disabled buttons with generic styling lack context for why they are disabled, leading to user confusion.
**Action:** Always add `aria-label` to file inputs that lack visible `<label>` elements. Apply dynamic `title` tooltips to conditionally disabled buttons to explain the required action (e.g., "Select a file to upload").
## 2024-05-02 - Async Actions Need Obvious Loading States
**Learning:** During the creation of a workflow, users can experience confusion if the modal stays open without visual feedback while the network request is in-flight. Modal forms must have specific loading states and proper `aria-required` bindings for accessibility.
**Action:** Always add an `isCreating`/`isSaving` state to network-dependent modal actions, update the button text (e.g. 'Creating...'), and disable the button while loading. Ensure required inputs use both HTML5 `required` and `aria-required="true"`.
## 2024-05-24 - Keyboard Navigation Visibility on Custom Tabs
**Learning:** Custom navigation buttons, such as those used in sidebars or header tab bars, often suppress default browser focus outlines due to custom background colors or border styling, making keyboard navigation invisible and inaccessible to users.
**Action:** Always apply explicit `focus-visible` utility classes (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500`) to custom navigation buttons and tabs to ensure a clear focus indicator is present for keyboard users.
## 2024-05-24 - Interactive Component Focus Indicators
**Learning:** Config panels and deeply nested form buttons sometimes rely strictly on standard border outlines, which may conflict with container borders or background colors, making keyboard tab-navigation confusing. Adding `focus-visible` styles enhances usability without impacting mouse hover states. Furthermore, disabled buttons that omit dynamic context via `title` tags confuse users regarding the state they need to resolve to progress.
**Action:** Consistently append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500` to form buttons and configure conditional tooltips (`title`) on dynamically disabled controls explaining their disabled state.
## 2024-05-24 - File Upload Keyboard Navigation Visibility
**Learning:** Functional file upload buttons without `focus-visible` states make keyboard navigation invisible and confusing for accessibility users relying on tabs.
**Action:** Always append explicit focus rings (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500`) to upload or submit buttons in UI forms.
