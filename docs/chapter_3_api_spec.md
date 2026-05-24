# Chapter 3: Interface Protocols & API Specifications

Source: [MentalHealthApp/backend/main.py](MentalHealthApp/backend/main.py)

Overview: the backend is a FastAPI service exposing JSON REST endpoints over HTTP. Authentication uses stateless JWTs (HS256). Protected routes depend on `get_current_user` (see Security Ingress section).

1) GET /health
- Route: `/health`
- Method: GET
- Access: Public
- Request: none
- Response (200):
  - JSON: `{ "status": "ok", "timestamp": "<ISO8601 UTC>" }`
- Errors: none explicit in handler

2) POST /auth/register
- Route: `/auth/register`
- Method: POST
- Access: Public
- Request Contract (JSON body): `AuthSchema`
  - `email`: string (required)
  - `password`: string (required)
- Headers: `Content-Type: application/json`
- Response (201/200 in code returns 200 with TokenSchema):
  - `TokenSchema`:
    - `token`: string (JWT, HS256, contains `sub` = user id, `exp` = 7 days)
    - `userId`: integer
- Explicit error handling:
  - 400 Bad Request — if `email` already exists (raises HTTPException 400)
  - 422 Unprocessable Entity — if payload fails Pydantic validation (FastAPI)

3) POST /auth/login
- Route: `/auth/login`
- Method: POST
- Access: Public
- Request Contract (JSON body): `AuthSchema` same as register
- Response (200): `TokenSchema` (same shape as register)
- Explicit errors:
  - 401 Unauthorized — invalid credentials (returns HTTPException 401)
  - 422 Unprocessable Entity — invalid request body

4) GET /assessments/questions
- Route: `/assessments/questions`
- Method: GET
- Access: Public
- Request: none
- Response (200): list of question objects (MOCK_QUESTIONS)
  - Each question object fields:
    - `id`: string (e.g. `phq1`, `gad2`)
    - `text`: string
    - `category`: string (`depression` | `anxiety`)
    - `options`: array of option objects `{ label: string, value: number }`
- Errors: none explicit

5) POST /assessments
- Route: `/assessments`
- Method: POST
- Access: Protected — requires `Authorization: Bearer <JWT>`
- Security: `get_current_user` dependency extracts and verifies JWT, injects ORM `User`
- Request Contract (JSON body): `AssessmentSubmitSchema`:
  - `anxiety_score`: float (required)
  - `depression_score`: float (required)
- Response (200):
  - `{ "message": "Assessment submitted successfully", "assessment_id": <int> }`
- Errors:
  - 401 Unauthorized — invalid/missing JWT or user not found (raised by `get_current_user`)
  - 422 Unprocessable Entity — invalid payload

6) GET /assessments/history
- Route: `/assessments/history`
- Method: GET
- Access: Protected — requires `Authorization: Bearer <JWT>`
- Query Parameters:
  - `days`: integer (optional, default = 30). If `days <= 0` handler returns empty list for assessments endpoint.
- Response (200): `AssessmentHistoryResponse`:
  - `items`: array of `AssessmentHistoryItem` objects
    - `id`: int
    - `depression_score`: float
    - `anxiety_score`: float
    - `created_at`: datetime (ISO)
- Errors:
  - 401 Unauthorized — invalid/missing JWT
  - 422 Unprocessable Entity — invalid query param types

7) POST /ml/classify
- Route: `/ml/classify`
- Method: POST
- Access: Protected — requires `Authorization: Bearer <JWT>`
- Request Contract (JSON body): `MLClassifyRequest`
  - `text`: string (required)
- Response (200): `MLClassifyResponse`
  - `label`: string (mapped human-readable label, e.g., `Low concern`)
  - `confidence`: number (0.0 - 1.0, rounded to 2 decimals)
  - `error`: string | null
- Explicit error handling:
  - 503 Service Unavailable — when `HF_API_TOKEN` missing (returns JSONResponse 503)
  - 503 Service Unavailable — HF request timeout or HTTP error
  - 503 Service Unavailable — malformed or empty HF response
  - 401 Unauthorized — invalid/missing JWT
  - 422 Unprocessable Entity — invalid payload

8) POST /mood
- Route: `/mood`
- Method: POST
- Access: Protected — requires `Authorization: Bearer <JWT>`
- Request Contract (JSON body): `MoodCreate`
  - `mood_score`: integer (required, intended range 1-10)
  - `note`: string | null (optional)
- Response (200): `MoodResponse` (persisted row)
  - `id`: int
  - `mood_score`: int
  - `note`: string|null
  - `recorded_at`: datetime (ISO)
- Explicit errors:
  - 422 Unprocessable Entity — if `mood_score` not in 1-10 (handler raises HTTPException 422)
  - 401 Unauthorized — invalid/missing JWT
  - 422 Unprocessable Entity — invalid body

9) GET /mood/history
- Route: `/mood/history`
- Method: GET
- Access: Protected — requires `Authorization: Bearer <JWT>`
- Query Parameters:
  - `days`: integer (optional, default = 30). If `days <= 0` handler raises HTTPException(400).
- Response (200): array of `MoodResponse` items (ordered most recent first by `recorded_at` in handler)
- Errors:
  - 400 Bad Request — if `days <= 0` (handler explicitly raises 400)
  - 401 Unauthorized — invalid/missing JWT
  - 422 Unprocessable Entity — invalid query param types

Headers and Common Behavior
- Content-Type: `application/json` for all JSON POSTs.
- Authentication header: `Authorization: Bearer <JWT>` for all protected endpoints.
- On 401 from backend, client `apiClient` interceptor dispatches `logoutUser()` and surfaces authorization failure to UI.

Security Ingress (middleware / dependency)
- `get_db()` dependency:
  - Provides a SQLAlchemy `Session` via `SessionLocal()` and ensures `db.close()` in a `finally` block.
- `security = HTTPBearer()` + `get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db))`:
  - Extracts `credentials.credentials` (raw token) from the `Authorization` header.
  - Decodes JWT with `jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])` and extracts `user_id` from `sub` claim.
  - If `sub` missing or token invalid (PyJWT exceptions), raises HTTPException 401.
  - Looks up `User` by id in DB; if not found raises HTTPException 401.
  - Returns ORM `User` instance injected into endpoints as `current_user`.

Notes on status codes, validation, and runtime failures
- FastAPI/Pydantic will automatically return 422 for malformed request bodies and will return validation error details.
- Several handlers raise explicit HTTPExceptions with 400/401/422; `/ml/classify` returns 503 JSONResponses for downstream ML service issues.
- App startup will `raise RuntimeError` if `DATABASE_URL` or `SECRET_KEY` is not set — this prevents the server from booting without required env vars; handle in deployment.

Samples (shorthand)
- Login request:

  POST /auth/login
  Headers: `Content-Type: application/json`
  Body: `{ "email": "user@example.com", "password": "hunter2" }`

  200 OK: `{ "token": "<jwt>", "userId": 42 }`

- Protected request example:

  GET /assessments/history?days=7
  Headers: `Authorization: Bearer <jwt>`

  200 OK: `{ "items": [ { "id": 7, "depression_score": 3.0, "anxiety_score": 1.0, "created_at": "2026-05-20T12:34:56Z" } ] }`

Appendix: Developer notes
- Ensure `SECRET_KEY` and `HF_API_TOKEN` are provided in the runtime environment; otherwise the server raises on startup or endpoints return 503 for ML.
- Consider standardizing response codes (e.g., return 201 for created resources) and adding OpenAPI descriptions / response examples to improve generated client code.

End of Chapter 3
