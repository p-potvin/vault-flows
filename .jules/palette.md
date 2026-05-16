## 2024-04-22 - [Edit Workflow Modal Accessibility & UX Polish]
**Learning:** Adding dynamic disabled tooltips (e.g., explaining why a button is disabled) paired with visual `disabled:opacity-60` cues significantly clarifies form states for users who might otherwise struggle to identify missing required fields.
**Action:** Always conditionally render the `title` attribute for disabled buttons so the error tooltip doesn't persist inappropriately when the button becomes active again.
