# Chapter 2: The Data Layer & State Mechanics

**Source references**: [MentalHealthApp/backend/models.py](MentalHealthApp/backend/models.py), [MentalHealthApp/backend/main.py](MentalHealthApp/backend/main.py)

**Entity-Relationship Topology**

- **`users` table**:
  - **Columns**: `id` (Integer, PK, indexed), `email` (String, unique, indexed, NOT NULL), `hashed_password` (String, NOT NULL), `encrypted_demographics` (String, NULLABLE), `created_at` (DateTime, default server-side callable UTC)
  - **Primary Key**: `id`
  - **Unique Constraints**: `email` is unique (prevents duplicate accounts).
  - **Indexes**: `id` and `email` declared with `index=True` in model.
  - **Notes**: `String` has no explicit length—Postgres will map to `text`. `created_at` is populated via a Python default (UTC-aware `datetime.now(timezone.utc)`).

- **`assessments` table**:
  - **Columns**: `id` (Integer, PK, indexed), `user_id` (Integer, FK -> `users.id`, NOT NULL), `anxiety_score` (Float, NOT NULL), `depression_score` (Float, NOT NULL), `taken_at` (DateTime, default UTC)
  - **Primary Key**: `id`
  - **Foreign Keys**: `user_id` references `users.id` via `ForeignKey('users.id')` (no DB-level `ON DELETE` specified).
  - **Indexes**: `id` indexed; `user_id` is not explicitly indexed in the model (recommend adding an index for query performance).
  - **Constraints**: score columns are NOT NULL; no explicit value-range constraints are enforced at DB level.

- **`progress` table**:
  - **Columns**: `id` (Integer, PK, indexed), `user_id` (Integer, FK -> `users.id`, NOT NULL), `mood_score` (Integer, NOT NULL; intended 1-10), `note` (String, NULLABLE), `avg_anxiety` (Float, NULLABLE), `avg_depression` (Float, NULLABLE), `avg_stress` (Float, NULLABLE), `recorded_at` (DateTime, default UTC)
  - **Primary Key**: `id`
  - **Foreign Keys**: `user_id` references `users.id` via `ForeignKey('users.id')` (no DB-level cascade declared).
  - **Indexes**: `id` indexed; `user_id` not explicitly indexed (recommend adding index).
  - **Constraints**: `mood_score` is NOT NULL; range enforcement (1-10) occurs in application logic (see `main.py`) rather than at DB.

**State Lifecycle & Flow**

- **Ingress & Validation (Transport → Pydantic DTO)**:
  - HTTP requests arrive at the FastAPI endpoints defined in `main.py` (e.g., `POST /assessments`, `POST /mood`, `POST /auth/register`).
  - Incoming JSON bodies are parsed and validated by Pydantic models: `AssessmentSubmitSchema`, `MoodCreate`, `AuthSchema`, etc. Validation enforces types and presence of required fields before handler execution.

- **Authentication & Identity Injection**:
  - Protected endpoints declare a dependency on `get_current_user`, which uses `HTTPBearer` to extract a JWT from `Authorization: Bearer <token>`.
  - The JWT is decoded using `SECRET_KEY` and `HS256` (server-side). On success, `get_current_user` looks up the `User` row via the ORM and yields a `User` instance to the endpoint handler.

- **Persistence (DTO → ORM → DB)**:
  - Handlers receive validated Pydantic DTOs and the `current_user` ORM instance plus a DB `Session` from `get_db()`.
  - A new ORM object is created (e.g., `Assessment(user_id=current_user.id, anxiety_score=..., depression_score=...)` or `Progress(...)`).
  - The handler calls `db.add(new_obj)`, `db.commit()`, and `db.refresh(new_obj)` to persist and materialize DB-generated fields (PK, timestamps).
  - These operations are synchronous SQLAlchemy ORM transactions using the `SessionLocal` bound to the `DATABASE_URL` connection to Postgres.

- **Return Cycle**:
  - After `commit()` and `refresh()`, the ORM instance is converted into response JSON either manually or via Pydantic response models (or implicit serialization for simple models). The client receives the persisted record identifiers and timestamps.

**Relational Interdependencies**

- **ORM-level cascades**:
  - The `User` model defines `assessments = relationship(..., cascade="all, delete-orphan")` and `progress_records = relationship(..., cascade="all, delete-orphan")`. This config instructs SQLAlchemy to propagate deletes performed through the ORM: deleting a `User` object within a managed session will delete related `Assessment` and `Progress` rows.
  - Important distinction: ORM cascade is a client-side behavior (SQLAlchemy issues DELETE statements). The DB-level FK definitions in the models do NOT include `ON DELETE CASCADE`; so deleting a user directly in the DB (outside the ORM) will not cascade unless `ON DELETE` is added to the `ForeignKey`.

- **Join and lookup patterns**:
  - Common queries are user-scoped (e.g., `db.query(Assessment).filter(Assessment.user_id == current_user.id, ...)`). These rely on `user_id` equality filters; lacking an explicit index on `user_id` may degrade performance for large datasets.
  - `back_populates` enables bidirectional navigation: `user.assessments` and `assessment.user`. Without `lazy` override SQLAlchemy defaults (select) may cause N+1 queries when iterating related collections unless queries use explicit joins or eager loading.

- **Indexes & Optimization**:
  - Present indexes: `id` primary keys and `email` (unique + indexed).
  - Suggested optimizations:
    - Add indexes on `assessments.user_id` and `progress.user_id` to speed user-scoped queries and joins.
    - Consider DB-level `CHECK` constraints for score ranges (e.g., `mood_score BETWEEN 1 AND 10`) if you want guardrails enforced at the database layer.
    - Add `ON DELETE CASCADE` to foreign keys or keep ORM-level deletes and document expected access patterns (ORM-only vs. mixed DB/ORM operations).

**Operational and Data Integrity Notes**

- **Timezones & Defaults**: All timestamp defaults use a Python callable that returns UTC-aware datetimes. This ensures server-side insertion timestamps are UTC, but because the default runs client-side (in the application process) rather than as DB defaults, clock skew between app and DB hosts could produce small inconsistencies.

- **Secrets & Auth**: `main.py` raises at startup if `SECRET_KEY` is not set. JWT subject (`sub`) is set to the `User.id` string; token expiry is handled via a 7-day `exp` claim.

- **ML Requests**: The `/ml/classify` flow is not persisted. The backend proxies requests to HuggingFace using `httpx.AsyncClient`, maps labels, and returns a small response. No ML results are stored in the DB by current models.

**Recommendations**

- Add explicit DB indexes on `assessments.user_id` and `progress.user_id`.
- Add `ondelete="CASCADE"` to `ForeignKey('users.id')` if you want DB-level cascades and to make direct DB deletes safe and consistent.
- Implement DB `CHECK` constraints for numeric ranges (PHQ/GAD score ranges, `mood_score` 1-10) where strict domain enforcement is required.
- For performance-sensitive reads of historical data, add composite indexes (e.g., `(user_id, taken_at DESC)` or `(user_id, recorded_at DESC)`) to accelerate time-windowed queries.

End of Chapter 2
