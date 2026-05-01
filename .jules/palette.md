## 2024-05-24 - File Input Accessibility & Disabled Button Tooltips
**Learning:** React `<input type="file">` elements without explicit labels are inaccessible to screen readers. Additionally, disabled buttons with generic styling lack context for why they are disabled, leading to user confusion.
**Action:** Always add `aria-label` to file inputs that lack visible `<label>` elements. Apply dynamic `title` tooltips to conditionally disabled buttons to explain the required action (e.g., "Select a file to upload").
