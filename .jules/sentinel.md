## 2026-04-18 - Insecure API key comparison

**Vulnerability:** The API key middleware was performing a direct comparison between the raw API key provided in the request header and the stored value in the database. This pattern was susceptible to timing attacks and exposed raw API keys if the database was compromised.

**Learning:** Always hash API keys before storage and comparison. Use SHA-256 for high-entropy secrets and employ `secrets.compare_digest` to prevent timing attacks during validation.

**Prevention:** Ensure all authentication middleware hashes incoming credentials and uses secure comparison utilities. Standardize on a hashing helper for both generation/storage and validation.
## 2025-05-18 - Restrict CORS Configuration
**Vulnerability:** The FastAPI backend used a wildcard (`allow_origins=["*"]`) with `allow_credentials=True`, creating an overly permissive CORS configuration.
**Learning:** This combination allows any origin to make authenticated requests, which is a severe security risk. It's a common misconfiguration for local development that accidentally makes it to production.
**Prevention:** Use an environment variable (`ALLOWED_ORIGINS`) to define a whitelist of trusted origins and parse it at application startup, providing safe local defaults like localhost ports.
