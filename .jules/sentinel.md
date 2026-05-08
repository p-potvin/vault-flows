## 2024-04-18 - Secure API Key Validation using Hashing and Constant-Time Comparison
**Vulnerability:** The API key verification logic in `api_key_required` (`backend/api_key_middleware.py`) was directly querying the database with the plaintext API key provided in the `x_api_key` header. This could potentially leak the expected API key over time via timing attacks or expose plaintext API keys if the database is ever compromised, as it assumes the database stores plain keys or relies on plaintext search.
**Learning:** Checking credentials securely requires two steps: one-way hashing for storage and verification, and constant-time string comparison to resist timing attacks. We implemented SHA-256 to hash the incoming key before querying the DB and used `secrets.compare_digest` to verify the retrieved database hash matches the provided hashed key. This protects both against database exposure (assuming DB starts storing hashes as implied by `key_hash` field) and execution timing variations.
**Prevention:** Always implement strong, cryptographically secure hashing (like SHA-256) for verifying secrets against stored values, and always use constant-time comparison methods (`secrets.compare_digest()`) rather than standard equality (`==`) operators when checking API keys, passwords, or authentication tokens.
## 2026-04-18 - Insecure API key comparison

**Vulnerability:** The API key middleware was performing a direct comparison between the raw API key provided in the request header and the stored value in the database. This pattern was susceptible to timing attacks and exposed raw API keys if the database was compromised.

**Learning:** Always hash API keys before storage and comparison. Use SHA-256 for high-entropy secrets and employ `secrets.compare_digest` to prevent timing attacks during validation.

**Prevention:** Ensure all authentication middleware hashes incoming credentials and uses secure comparison utilities. Standardize on a hashing helper for both generation/storage and validation.
## 2025-05-18 - Restrict CORS Configuration
**Vulnerability:** The FastAPI backend used a wildcard (`allow_origins=["*"]`) with `allow_credentials=True`, creating an overly permissive CORS configuration.
**Learning:** This combination allows any origin to make authenticated requests, which is a severe security risk. It's a common misconfiguration for local development that accidentally makes it to production.
**Prevention:** Use an environment variable (`ALLOWED_ORIGINS`) to define a whitelist of trusted origins and parse it at application startup, providing safe local defaults like localhost ports.

## 2024-04-19 - Exposed Personal Access Token in Prompt
**Vulnerability:** The user provided a GitHub Personal Access Token (PAT) in plaintext within the conversation prompt. Hardcoding or storing this token in the repository would lead to credential exposure.
**Learning:** Users may inadvertently share sensitive tokens when requesting automation that requires API access.
**Prevention:** Never hardcode provided tokens in source code, scripts, or configuration files. Use environment variables and secret management systems (like GitHub Actions Secrets) to handle credentials securely. Advise the user to revoke the exposed token and use a secret manager.
## $(date +%Y-%m-%d) - Prevent Command Injection in `run_local_runtime_bridge.py`
**Vulnerability:** The `resolve_command` function inside the local runtime bridge took the `facefusionCommand` payload string provided by the user and directly passed it to `subprocess.run()`. This allowed arbitrary execution of commands on the Windows host machine.
**Learning:** Naively executing external binaries by user-supplied paths without restriction represents an immediate remote code execution vector. Because the command may include Windows-style paths (e.g., `C:\facefusion\facefusion.bat`), one must parse it correctly using `shlex.split(command, posix=False)` to prevent string parsing errors. Furthermore, simply splitting strings doesn't prevent an attacker from swapping `facefusion` with `cmd.exe /c calc` or `python -c "..."`.
**Prevention:** Always construct command execution with arguments where the executable is strictly checked against a known allow-list (e.g. `['facefusion', 'python']`). Secondary logic flags inside languages that could themselves act as execution environments (like `python -c`) should be rejected if the payload string attempts to run them.

## 2026-04-25 - Prevent Path Traversal in run_local_runtime_bridge.py
**Vulnerability:** The `run_local_runtime_bridge.py` server used the user-provided `saveDirectory` parameter to dynamically create an output path (`Path(requested_save_dir)`). This allowed arbitrary absolute paths or relative traversal strings, enabling remote attackers to overwrite files anywhere on the local filesystem.
**Learning:** Relying purely on `Path()` composition without bounds checking is dangerous when handling file system writes initiated over an HTTP endpoint, even for local tooling bridges.
**Prevention:** Apply a robust bounds check. Resolve user-provided paths relative to a strict base directory (`JOB_ROOT`) using `os.path.abspath()` and verify it remains enclosed within that base directory using `os.path.commonpath([base_dir, resolved_path]) == base_dir`.

## 2026-04-26 - Prevent Path Traversal via Filename in `run_local_runtime_bridge.py`
**Vulnerability:** The `normalize_output_name` function blindly returned the `outputName` string from user-supplied payloads, which was later appended to a directory path. An attacker could supply `../../evil.exe` to overwrite arbitrary system files outside the job directory.
**Learning:** Unsanitized filenames mixed with directory paths expose local runtime bridges to path traversal attacks, even if the target directory is otherwise checked or isolated.
**Prevention:** When accepting a raw filename from an external payload to create a local file, extract strictly the base name using `Path(filename).name` before using it in any file path composition.

## 2026-05-01 - Prevent Path Traversal in resolve_project_file
**Vulnerability:** The `resolve_project_file` function in `run_coordinated_system.py` combined user-provided paths with a root directory and resolved them, but failed to ensure the resolved path remained within the intended root directory. This allowed path traversal using `../` components, potentially exposing arbitrary files on the filesystem.
**Learning:** Resolving a path (e.g. `pathlib.Path.resolve()`) normalizes it and resolves `../` sequences, but does not prevent the resulting path from pointing outside the initial base directory. You must explicitly verify boundaries after resolution.
**Prevention:** To prevent path traversal vulnerabilities when resolving user-provided file paths with `pathlib.Path`, explicitly verify the boundary using `resolved_path.is_relative_to(base_dir)` after calling `.resolve()`.

## 2026-05-02 - Prevent Git Options Injection in `git clone`
**Vulnerability:** The `resolve_repo_path` function in `run_coordinated_system.py` directly passed an unsanitized `repo_url` to `git clone` without a `--` separator. An attacker could supply a URL starting with a hyphen (e.g., `--upload-pack=...` or `--config`) to inject arbitrary Git options, potentially leading to arbitrary command execution on the host system.
**Learning:** Functions that invoke command-line tools like `git` with user-supplied arguments are vulnerable to options injection if they don't explicitly separate flags from positional arguments. Even if the argument is intended to be a URL or path, if it starts with `-`, the tool may interpret it as a command-line flag.
**Prevention:** Always use the `--` double-dash separator to signify the end of command options when passing variable data to command-line tools like `git`. For example: `["git", "clone", "--", repo_url, target_path]`.

## 2024-05-08 - Prevent Git Options Injection via Branch Names
**Vulnerability:** The `run_git` calls in `run_coordinated_system.py` directly appended user-supplied `branch` names (e.g., in `git rev-parse --verify`, `git branch`, `git switch`, and `git push`). An attacker could supply a branch name starting with `-` (e.g. `-h` or other git options), potentially bypassing validations or leading to options injection.
**Learning:** Even internal Git subcommands can interpret user-supplied branch names as options if they start with a hyphen.
**Prevention:** Always include the `--` separator to explicitly delineate flags from positional arguments when passing variables such as branch names, paths, or URLs to Git commands (e.g., `git push origin -- branch_name`, `git switch -- branch_name`).
