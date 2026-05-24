# Chapter 5: DevOps & Operational Configuration

Source references: [docker-compose.yml](docker-compose.yml), [MentalHealthApp/docker-compose.yml](MentalHealthApp/docker-compose.yml), [requirements.txt](requirements.txt), [MentalHealthApp/requirements.txt](MentalHealthApp/requirements.txt), [MentalHealthApp/package.json](MentalHealthApp/package.json), [MentalHealthApp/backend/main.py](MentalHealthApp/backend/main.py)

**1. Runtime Dependencies**

- Interpreter / platform runtimes (inferred):
  - **Python**: 3.11 (backend Docker image uses `python:3.11-slim`). Local developer venv should target Python 3.11 for parity.
  - **Node / JS / Expo**: Expo SDK ~55 (see `expo` in `MentalHealthApp/package.json`), React `19.2.6`, React Native `0.83.6`. Use Node 18+ or an LTS matching Expo recommendations.

- Critical backend packages (see `MentalHealthApp/requirements.txt`):
  - `fastapi`, `uvicorn`, `gunicorn` — ASGI server and app framework
  - `sqlalchemy`, `psycopg2-binary` — ORM and Postgres driver
  - `passlib[bcrypt]` — password hashing
  - `pydantic` — request/response validation
  - `PyJWT` — JWT encode/decode
  - `httpx` — async HTTP client for external APIs (HuggingFace)
  - `pytest`, `pytest-asyncio` — test framework

- Critical frontend packages (see `MentalHealthApp/package.json`):
  - `expo`, `react`, `react-native` — runtime
  - `axios` — HTTP client used by `src/api/client.ts`
  - `@reduxjs/toolkit`, `react-redux` — client state management
  - Testing: `jest`, `@testing-library/react-native`

**2. Environmental Configuration Matrix**

The application reads and expects several environment variables. Below is a comprehensive dictionary of values referenced in source and compose files.

- `DATABASE_URL`
  - Purpose: SQLAlchemy connection string used by backend to connect to Postgres (e.g., `postgresql://user:pass@postgres:5432/dbname`).
  - Where used: `MentalHealthApp/backend/main.py` — passed to `create_engine()`.
  - Required: yes at runtime; `main.py` raises if missing.
  - Set by: `MentalHealthApp/docker-compose.yml` (in `backend.environment`) or host/CI via env-file.

- `SECRET_KEY`
  - Purpose: HMAC secret for JWT signing/verification (`HS256`).
  - Where used: `MentalHealthApp/backend/main.py` — token encode/decode.
  - Required: yes; startup raises if missing.
  - Security: treat as high-sensitivity secret; do not commit to repo.

- `HF_API_TOKEN`
  - Purpose: Bearer token used to call HuggingFace inference API from `/ml/classify`.
  - Where used: `MentalHealthApp/backend/main.py` — if missing, `/ml/classify` returns 503.
  - Required: optional for app startup but required for ML endpoint functionality.

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Purpose: Postgres initialization parameters used by the Postgres image.
  - Where used: `docker-compose.yml` and `MentalHealthApp/docker-compose.yml` (service `postgres`).
  - Required: compose provides defaults; for production, replace with secure secrets.

- Container / Compose runtime behavior
  - `mindcare_data` (named volume): persisted Postgres data in compose mapping to `/var/lib/postgresql/data`.
  - `DATABASE_URL` in compose is set to `postgresql://mindcare_user:mindcare_pass@postgres:5432/mindcare_db` (developer convenience).

- Recommended / optional environment variables to add (not currently present but advised):
  - `ENV` or `FLASK_ENV`/`APP_ENV` (e.g., `development`/`production`) — control debug/verbosity.
  - `LOG_LEVEL` — `INFO`/`DEBUG` for structured logging.
  - `SENTRY_DSN` — optional observability.
  - `ALLOWED_HOSTS` / CORS settings — for runtime network hardening.

**3. Terminal Command Index**

Below are the curated commands for local development, testing, and Docker-based runs. Replace environment values with secure secrets in CI or `.env` files.

- Start full local dev environment with Docker Compose (from `MentalHealthApp/`):

```bash
cd MentalHealthApp
docker-compose up --build
```

This brings up `postgres` and `backend` services (backend uses `python:3.11-slim` and runs `uvicorn backend.main:app --reload`). Postgres data persists in the named volume `mindcare_data`.

- Stop and remove containers and volumes:

```bash
docker-compose down
docker volume rm mindcare_data
```

- Run backend locally in a Python virtual environment (recommended for iterative dev)

Windows PowerShell example (adjust for other shells):

```powershell
# from repo root or MentalHealthApp/
python -m venv .venv
& .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r MentalHealthApp/requirements.txt

# set required env vars for current session
$env:DATABASE_URL = 'postgresql://mindcare_user:mindcare_pass@localhost:5432/mindcare_db'
$env:SECRET_KEY = 'change_me_for_dev'
$env:HF_API_TOKEN = 'hf_***'  # optional for ML endpoint

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

- Run backend tests (pytest):

```bash
cd MentalHealthApp
pytest -q
```

- Run frontend (Expo) dev server:

```bash
cd MentalHealthApp
npm install     # or yarn install
expo start
```

Notes: Android emulator → backend uses `http://10.0.2.2:8000`; iOS / web use `http://localhost:8000` (see `src/api/client.ts`).

- Run frontend unit tests (Jest):

```bash
cd MentalHealthApp
npm test
```

- Run quick cleanup / maintenance scripts (repo root):

```bash
# cleanup test users script (may require env DB settings)
python cleanup_test_users.py

# manual verification script
python manual_verification_test.py
```

- Build production-ready backend with Gunicorn (example):

```bash
# run inside a container or virtualenv with installed packages
gunicorn -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:8000 --workers 4
```

**4. Operational Recommendations**

- Secrets: Place `SECRET_KEY` and `HF_API_TOKEN` in a secure vault (e.g., GitHub Actions secrets, AWS Secrets Manager) and inject them at runtime. For local dev, use a `.env` file and reference with `env_file` in `docker-compose.yml`.
- Migrations: introduce Alembic for schema migrations and add a `migrations/` directory. This enables safe schema evolution (indexes, `ON DELETE` cascades, CHECK constraints).
- Healthchecks & readiness: add a lightweight healthcheck for the Postgres service and use a wait-for mechanism in the backend to avoid immediate connection failures on container start.
- Observability: add structured logging (`python.logging` with JSON formatter) and integrate with centralized logs/traceback (Sentry or similar).

**5. Quick `.env.sample` (suggested)**

```env
# Database
DATABASE_URL=postgresql://mindcare_user:mindcare_pass@postgres:5432/mindcare_db

# Security
SECRET_KEY=replace_with_a_secure_random_value

# External APIs
HF_API_TOKEN=replace_with_hf_token

# Optional
LOG_LEVEL=INFO
ENV=development
```

Place this file at `MentalHealthApp/.env.sample` and create a `MentalHealthApp/.env` locally (never commit `.env`). Then update `docker-compose.yml` to reference `env_file: .env` for the backend service.

End of Chapter 5
