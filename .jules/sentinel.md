## 2025-05-18 - Restrict CORS Configuration
**Vulnerability:** The FastAPI backend used a wildcard (`allow_origins=["*"]`) with `allow_credentials=True`, creating an overly permissive CORS configuration.
**Learning:** This combination allows any origin to make authenticated requests, which is a severe security risk. It's a common misconfiguration for local development that accidentally makes it to production.
**Prevention:** Use an environment variable (`ALLOWED_ORIGINS`) to define a whitelist of trusted origins and parse it at application startup, providing safe local defaults like localhost ports.
