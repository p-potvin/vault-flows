## 🛡️-2024-05-18 - [Implemented Secure Dataset Manager Scaffolding]
**Vulnerability:** File upload forms without strict MIME type validation and safe handling of errors can result in arbitrary execution and leak sensitive server information.
**Learning:** Adding structural validation (`ALLOWED_MIME_TYPES`, size limit) before touching the server state prevents these issues entirely on the client, and secure `catch` blocks stop trace leaking.
**Prevention:** Always validate size and specific MIME type arrays on file input components before setting State or beginning an upload stream.
