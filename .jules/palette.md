## 2024-05-24 - File Input Accessibility & Disabled Button Tooltips
**Learning:** React `<input type="file">` elements without explicit labels are inaccessible to screen readers. Additionally, disabled buttons with generic styling lack context for why they are disabled, leading to user confusion.
**Action:** Always add `aria-label` to file inputs that lack visible `<label>` elements. Apply dynamic `title` tooltips to conditionally disabled buttons to explain the required action (e.g., "Select a file to upload").
## 2024-05-02 - Async Actions Need Obvious Loading States
**Learning:** During the creation of a workflow, users can experience confusion if the modal stays open without visual feedback while the network request is in-flight. Modal forms must have specific loading states and proper `aria-required` bindings for accessibility.
**Action:** Always add an `isCreating`/`isSaving` state to network-dependent modal actions, update the button text (e.g. 'Creating...'), and disable the button while loading. Ensure required inputs use both HTML5 `required` and `aria-required="true"`.
