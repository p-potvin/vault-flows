## 2024-04-22 - [Edit Workflow Modal Accessibility & UX Polish]
**Learning:** Adding dynamic disabled tooltips (e.g., explaining why a button is disabled) paired with visual `disabled:opacity-60` cues significantly clarifies form states for users who might otherwise struggle to identify missing required fields.
**Action:** Always conditionally render the `title` attribute for disabled buttons so the error tooltip doesn't persist inappropriately when the button becomes active again.
## 2024-04-26 - [ConfigPanel Forms Accessibility]
**Learning:** Ensure that all `<label>` elements are properly linked to their corresponding form inputs (`<input>` or `<select>`) using the `htmlFor` attribute matching the `id` of the input to ensure screen-reader compatibility.
**Action:** Always assign a unique `id` to `<input>` or `<select>` elements and match it with the `htmlFor` property in their wrapper `<label>` when styling forms in React components.
