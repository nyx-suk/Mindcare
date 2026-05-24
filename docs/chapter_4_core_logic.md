# Chapter 4: Core Logic & Domain Business Rules

Source: [MentalHealthApp/backend/main.py](MentalHealthApp/backend/main.py), [MentalHealthApp/backend/models.py](MentalHealthApp/backend/models.py)

1. Operational Control Flows

- User registration (POST /auth/register)
  1. FastAPI receives JSON body and validates it against `AuthSchema` (Pydantic) — required fields: `email`, `password`.
  2. Handler queries DB for existing `User` with same `email`. If found, raise HTTPException(400).
  3. Hash plaintext password using `pwd_context.hash()` (pbkdf2_sha256 configured).
  4. Create `User` ORM instance, `db.add()`, `db.commit()`, `db.refresh()` to obtain `id` and `created_at`.
  5. Create JWT: `jwt.encode({"sub": str(user.id), "exp": now + 7 days}, SECRET_KEY, algorithm=ALGORITHM)` and return `TokenSchema` with `token` and `userId`.

- User login (POST /auth/login)
  1. Validate body with `AuthSchema`.
  2. Query `User` by email. If not found or password verify fails (`pwd_context.verify()`), raise HTTPException(401).
  3. On success, create JWT as in registration and return `TokenSchema`.

- Assessment submit (POST /assessments)
  1. Endpoint depends on `get_current_user`, which validates JWT and fetches `User`.
  2. Validate payload via `AssessmentSubmitSchema` (`anxiety_score`, `depression_score`).
  3. Create `Assessment(user_id=current_user.id, anxiety_score=..., depression_score=...)`, `db.add()`, `db.commit()`, `db.refresh()`.
  4. Return a success message and persisted `assessment_id`.

- Mood record (POST /mood)
  1. JWT validated via `get_current_user` dependency.
  2. Validate `MoodCreate` payload; handler enforces domain rule: `mood_score` must be 1–10, otherwise raise HTTPException(422).
  3. Create `Progress` ORM object, persist via session commit/refresh, then return the persisted `MoodResponse`.

- Assessment & mood history (GET /assessments/history, GET /mood/history)
  1. JWT validated via `get_current_user`.
  2. Query DB for records where `user_id == current_user.id` and timestamp >= cutoff date (computed by `days` param).
  3. For `/assessments/history`, results are ordered by `taken_at.asc()`. For `/mood/history`, ordered by `recorded_at.desc()` and returned.
  4. Validation: handlers validate `days` and either return empty list or raise 400 (mood/history uses 400 for days <= 0).

- ML classification (POST /ml/classify)
  1. JWT validated via `get_current_user`.
  2. Validate `MLClassifyRequest` (`text` required).
  3. Confirm `HF_API_TOKEN` exists in environment; if missing return JSONResponse(503).
  4. Build request JSON for HuggingFace: `{ "inputs": <text> }` and call via `httpx.AsyncClient.post()` with `Authorization: Bearer <HF_API_TOKEN>`.
  5. Handle HTTP or timeout errors; on success, parse response JSON, normalize predictions, select top prediction by `score`, map `label` to human-readable category, and return `MLClassifyResponse`.

2. Exceptional Fault Tolerance

- Defensive checks on startup
  - `main.py` checks `DATABASE_URL` and `SECRET_KEY` at import/startup and raises a `RuntimeError` if missing — prevents running with incomplete config.

- Request-time error handling
  - Pydantic & FastAPI: malformed payloads are rejected with automatic 422 responses.
  - Domain validation: handlers raise `HTTPException` with relevant status codes (400/401/422) for domain errors (e.g., duplicate email, invalid mood_score, unauthorized access).
  - `get_current_user` catches JWT decoding errors and raises HTTPException(401) — prevents leaking internal JWT exception traces.
  - `get_db()` yields a session and uses `finally` to `db.close()` ensuring no session leaks.

- External call error handling
  - `/ml/classify` wraps HF calls in try/except blocks catching `httpx.TimeoutException` and `httpx.RequestError` / `HTTPStatusError`, returning 503 JSON payloads that describe the service availability or timeout.

- Logging & exceptions
  - Current codebase contains no structured logging calls (no `logging` module usage found) and defines no custom exception classes. Errors are surfaced via FastAPI `HTTPException` or returned JSONResponses.
  - Recommendation: add structured logging (Python `logging` with JSON formatter) at key points: auth failures, DB errors, external service failures, and unhandled exceptions (attach correlation/request ids).
  - Recommendation: centralize exception handling with FastAPI exception handlers (`app.exception_handler`) to map internal exceptions to safe client responses and consistently log stack traces.

3. Third-Party Integrations

- Postgres (psycopg2 + SQLAlchemy)
  - Connection via `DATABASE_URL`. ORM sessions managed by `SessionLocal`. Persistence uses `db.add()`, `db.commit()`, `db.refresh()` patterns.
  - Failure modes: connectivity failure, auth error, schema mismatch. These surface as SQLAlchemy exceptions; currently no retry logic is implemented.
  - Recommendation: add transient retry with exponential backoff for connection attempts on startup, and instrument DB pool settings for production.

- HuggingFace inference API (httpx.AsyncClient)
  - Request mapping: service sends POST JSON `{ "inputs": <text> }` with `Authorization: Bearer <HF_API_TOKEN>` and Expect `application/json` response.
  - Response handling: code expects array-like response; it tolerates nested formats (checks if result is list of lists). It picks the `top_prediction = max(predictions, key=lambda x: x.get("score", 0))` and maps labels: `LABEL_0`/`Positive` -> `Low concern`, `LABEL_1`/`Negative` -> `Elevated concern`.
  - Failure modes handled explicitly: timeout (returns 503), HTTP errors (returns 503), malformed response (returns 503). No retry/backoff or rate-limit headers handling is implemented.
  - Recommendations:
    - Implement retry with jitter/backoff for idempotent classify requests (capped retries); respect `Retry-After` and rate-limit headers returned by HF.
    - Add circuit-breaker: after N consecutive HF failures, short-circuit to a degraded response and schedule health checks to restore.
    - Log full HF request/response metadata (masked) for debugging, but never log raw `HF_API_TOKEN` or PII.

- JWT (PyJWT) and password hashing (passlib)
  - Passwords hashed with `pwd_context` using `pbkdf2_sha256` scheme; `verify()` used on login.
  - JWTs created with `jwt.encode` and decoded with `jwt.decode` using `SECRET_KEY`. Expiry (`exp`) is enforced by claims; token validation errors are caught and mapped to 401.
  - Recommendation: rotate `SECRET_KEY` carefully and consider adding `iss`/`aud` claims and key versioning for smoother rotations.

Summary & Next Actions

- The code implements clear, simple business flows with defensive domain checks and robust external-call error handling for the ML integration. However, it lacks centralized logging, retries/circuit-breakers for external services, and DB-level constraints that would harden data integrity.
- Suggested immediate improvements:
  - Add structured logging and an application-wide exception handler.
  - Implement robust retry/backoff + circuit-breaker for HuggingFace calls.
  - Add DB-level `CHECK` constraints and relevant indexes; consider Alembic migrations for changes.

End of Chapter 4
