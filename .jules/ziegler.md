## 🛡️-05-15 - [VRAM OOM Denial of Service via Client-Side Validation]
**Vulnerability:** The application relied solely on client-side validation for memory-intensive LoRA training parameters (`batch_size`, `resolution`), allowing malicious or malformed backend API calls to trigger Out-Of-Memory (OOM) exceptions and crash the local bridge.
**Learning:** Client-side validation is insufficient for preventing resource-exhaustion attacks on local machine execution bridges. The API layer must enforce strict boundaries before passing payloads to the execution engine.
**Prevention:** Always implement strict numerical boundaries and type checking at the API handler level for resource-intensive operations, as implemented in `/lora/validate` via `validate_lora_params`.
