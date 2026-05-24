# System Architecture — Component & Network Diagram

```mermaid
flowchart LR
  subgraph Client["Mobile Client (Expo / React Native)"]
    UI[UI Screens & State (Redux)] --> APIClient["apiClient (axios)\nPlatform baseURL: localhost / 10.0.2.2"]
  end

  subgraph Network["Host / Emulator / Device"]
    APIClient -->|HTTP/REST JSON\nAuthorization: Bearer <JWT>| Backend["FastAPI (uvicorn)\nPort 8000"]
  end

  subgraph BackendService["Backend Service"]
    Backend -->|SQL over TCP (psycopg2)\npostgres://...:5432| Postgres["Postgres:15\nContainer: mindcare_postgres"]
    Backend -->|HTTPS JSON| HF["HuggingFace Inference API (external)"]
    Backend -->|reads env vars| Env["Env / Secrets: SECRET_KEY, HF_API_TOKEN, DATABASE_URL"]
  end

  subgraph DockerCompose["docker-compose (default bridge network)"]
    Postgres -.->|volume mount| Volume[("mindcare_data (named volume) -> /var/lib/postgresql/data")]
    Backend -.->|bind-mount| HostCode[(".:/app (host source -> container)\ncmd: pip install -r requirements.txt && uvicorn backend.main:app --reload")]
  end

  HostCode -.-> APIClient

  classDef svc fill:#ecf8ff,stroke:#0366d6;
  classDef db fill:#f0fff4,stroke:#2f855a;
  class Backend,APIClient svc;
  class Postgres db;

  %% Legend
  %% - Solid arrows: synchronous network calls (HTTP/SQL)
  %% - Dashed arrows: filesystem / dev mounts and env injection

```

Notes:
- Client ↔ Backend uses HTTP/REST JSON (port 8000). Mobile emulator mapping: Android uses `10.0.2.2`, others use `localhost`.
- Backend authenticates clients via JWT in `Authorization: Bearer <token>` header. Backend forwards text classification to HuggingFace over HTTPS.
- Docker Compose exposes Postgres on `5432:5432`, maps Uvicorn to `8000:8000`, mounts `mindcare_data` named volume for DB persistence and binds project source into the backend container for dev reload.
