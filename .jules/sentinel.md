## 2025-05-15 - Missing Password Complexity Validation

**Vulnerability:** The `/auth/register` endpoint did not enforce any password complexity requirements. Users could register with extremely weak passwords (e.g., "123"), making accounts vulnerable to brute-force and dictionary attacks.

**Learning:** Relying solely on Pydantic `str` types for sensitive fields like passwords is insufficient. Explicit validation logic or specialized Pydantic validators should be used to enforce security policies.

**Prevention:** Always implement password complexity validation at the entry point (API layer) before hashing. VaultWares standard requires passwords to be at least 12 alphanumeric characters.
