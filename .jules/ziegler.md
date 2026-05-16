## 🛡️-05-10 - Secure `run_local_runtime_bridge.py` models_dir scanning against path traversal
**Vulnerability:** The local bridge allowed clients to scan arbitrary filesystem paths by providing an absolute path or path traversal (`../`) strings via the `modelsDir` payload.
**Learning:** By default, user-provided inputs representing paths must always be sandboxed. Relying on the client to send a safe path is a security failure.
**Prevention:** Added an `--allowed-models-dir` CLI parameter to set a strict sandbox base boundary. Enforced validation inside the `scan_models` function using `Path(models_dir).resolve().is_relative_to(Path(allowed_models_dir).resolve())` before executing any file operations.
