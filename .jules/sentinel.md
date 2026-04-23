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
## 2026-04-22 - Command Injection in Local Runtime Bridge
**Vulnerability:** The `resolve_command` function used a basic `.split()` on a user-controlled string, which allowed the execution of any arbitrary command (e.g., bash scripts) and completely broke on Windows paths containing spaces.
**Learning:** Naively executing configuration-provided commands as child processes without strong whitelists opens up local Remote Code Execution (RCE). Furthermore, attackers can use "Living off the Land" (LotL) techniques like executing inline code via Python (`python -c`). When implementing security filters on command-line arguments, naive substring checks or breaking loops early can easily lead to bypasses due to flag combinations or early positional arguments.
**Prevention:** Always use `shlex.split` for secure command parsing, taking care to strip literal quotes. Enforce strict allowlists of permissible base executables (interpreters, scripts) and thoroughly parse argument flags to block dangerous inline executions while ensuring legitimate execution environments aren't blocked.
