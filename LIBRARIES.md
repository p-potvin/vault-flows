# Image Manipulation & Orchestration Libraries

## Frontend (React/Browser)
- **Masking & Canvas Control:** `fabric.js` (Crucial for the Mask Creation widget, lasso, and brush tools for inpainting).
- **Batch Cropping/Zoom:** `react-easy-crop` (Already in use, needs extension for batch logic).
- **Color Profiles & Levels:** `CamanJS` or raw WebGL shaders (for fast Photoshop-style client-side preview rendering).

## Backend (Python/API)
- **Image Processing Basics:** `Pillow` (PIL) and `OpenCV` (`cv2`) for backend resizing, batch conversions, and mask compositing.
- **Workflow Orchestration:** `Celery` or `RQ` (Redis Queue) to handle long-running background tasks like LoRA training and FaceFusion generation without blocking the web server.
- **Database ORM:** `SQLAlchemy` or `Prisma Client Python` (for Postgres interactions).
- **Security:** `FastAPI` Security utilities or `Flask-Limiter` for API Key validation and rate limiting.
- **Auto-Captioning:** `HuggingFace Transformers` (to run WD14 or JoyCaption models locally).
