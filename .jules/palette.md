## 2024-04-22 - [Edit Workflow Modal Accessibility & UX Polish]
**Learning:** Adding dynamic disabled tooltips (e.g., explaining why a button is disabled) paired with visual `disabled:opacity-60` cues significantly clarifies form states for users who might otherwise struggle to identify missing required fields.
**Action:** Always conditionally render the `title` attribute for disabled buttons so the error tooltip doesn't persist inappropriately when the button becomes active again.
## 2024-04-24 - [Visual Feedback for Async Actions]
**Learning:** Adding `disabled:opacity-60 disabled:cursor-not-allowed` and dynamic text to buttons during async actions significantly improves user feedback and prevents confusion about whether an action is processing.
**Action:** Always include visual disabled states and loading text for buttons that trigger asynchronous operations.

## 2024-04-24 - [Label Accessibility]
**Learning:** Proper association of `<label>` elements with their corresponding inputs/textareas using `htmlFor` and `id` is crucial for accessibility.
**Action:** Always ensure form elements have properly associated labels using `htmlFor` and `id`.
