# Mental Health Self-Assessment App

A mobile-first platform designed to help users track their mental health, visualize progress, and receive AI-powered recommendations or crisis support.

## Project Overview

- **Target Audience:** Adults 18-45 experiencing stress/anxiety.
- **Core Architecture:** 
  - **Frontend:** React Native (TypeScript, Redux).
  - **Backend:** FastAPI (Python) with PostgreSQL (SQLAlchemy).
- **Design Language:** Calming, clean palette heavily utilizing blues and greens (specifically `#4db6ac` teal).
- **Security:** Built from the ground up with HIPAA-ready compliance in mind.

## High-Level Architecture

The project follows a decoupled client-server architecture.

### Backend Infrastructure (`backend/`)
Built with FastAPI and focuses on secure, relational data tracking.
- **Schema (`models.py`)**:
  - `User`: Uses `passlib[bcrypt]` for secure password hashing and has an `encrypted_demographics` column for future demographic storage.
  - `Assessment`: Stores evaluations using native PostgreSQL **`JSONB`** (`responses` column) as the single source of truth for future machine learning analysis. Also stores pre-computed integers (`anxiety_score`, `depression_score`, `stress_score`) for rapid querying.
  - `Progress`: Stores aggregated metrics.
- **API Routes (`main.py`)**:
  - Auth Layer: `POST /auth/register` and `/auth/login` issuing JWTs.
  - Assessment Fetch: `GET /assessments/questions` serving a static battery of 10-15 psychological assessment questions.
  - Assessment Submission: `POST /assessments` receives raw JSON answers, calculates categorical scores on the backend, and inserts them natively.

### Frontend Architecture (`src/`)
- **State & API**: 
  - A custom Axios interceptor (`api/client.ts`) dynamically injects the `Authorization` JWT directly from Redux.
  - Redux (`store/`) utilizes `react-native-keychain` in `authSlice.ts` to securely persist the JWT. `assessmentSlice.ts` handles the ephemeral questionnaire state.
- **Navigation (`AppNavigator.tsx`)**: Separated into an Auth Stack (`Welcome`, `Login`, `Register`) and a Protected Stack (`Dashboard`, `Assessment`, `Results`, `Crisis Support`).
- **Core Views**:
  - `AssessmentScreen.tsx`: Retrieves dynamic questions via `useEffect`. Features a teal UI with animated progress bars and asynchronous `POST` dispatches.
  - `ResultsScreen.tsx`: Visualizes categorical scores using `react-native-chart-kit` (`BarChart`).
- **Safety Logic**: The `checkHighRisk` boolean in `services/scoring.ts` evaluates `Anxiety`, `Depression`, and `Stress` individually to safely route users to Crisis Support if any single threshold is breached.

## The Roadmap

We are currently finishing Phase 1 (Core Features) and preparing for Phase 2.

### Remaining Phase 1 (Core Features):
- Flesh out the `DashboardScreen.tsx` to visualize historical progress (`GET /progress/trend` using line charts).
- Flesh out the `CrisisScreen.tsx` (hotline directory, 988 integration).
- Implement personalized resource recommendations based on assessment results.

### Phase 2 (Advanced Features - Future):
- Machine Learning Integration: Using Hugging Face BERT models for sentiment analysis on qualitative feedback.
- Predictive analytics for mental health risk assessment.
- Therapist appointment booking system (Stripe integration).

## Strict Guardrails & Guidelines

- **Data Logic:** Never calculate assessment scores purely on the frontend.
- **Storage:** Never use `AsyncStorage` for sensitive data or tokens; always use `Keychain` for HIPAA compliance.
- **Database:** Do not alter the PostgreSQL `JSONB` schema, as we need that raw data intact for Phase 2 Machine Learning models.

## Local Environment Setup

To pick up this project and resume implementation:

### 1. Run Backend Services (Database & API)
The easiest way to run the FastAPI backend and PostgreSQL database is using Docker Compose:
```bash
docker-compose up -d
```
This will automatically spin up:
- `mindcare_postgres` on port 5432
- `mindcare_backend` on port 8000

*Alternatively, to run the backend locally without Docker (requires local Postgres):*
```bash
# In the root directory with your virtual environment activated:
pip install -r requirements.txt
cd MentalHealthApp
uvicorn backend.main:app --reload
```

### 2. Run the Frontend (Expo / React Native)
Navigate into the `MentalHealthApp` directory and start the Expo development server:
```bash
cd MentalHealthApp
npm install
npx expo start
```
From the terminal, you can:
- Hit `a` to open the app on an Android emulator
- Hit `i` to open the app on an iOS simulator
- Scan the QR code using the **Expo Go** app on your physical device.

*Note: The Axios `BASE_URL` in `src/api/client.ts` defaults to `10.0.2.2` (Android emulator localhost). Update this to your machine's local IP address if testing on a physical iOS/Android device.*

### 3. Run Backend Tests
To verify all backend endpoints, ML integration, and Database integrity, run the pytest suite:
```bash
# Ensure both PostgreSQL and the FastAPI server (port 8000) are actively running!
cd MentalHealthApp
python -m pytest tests/test_phase1.py tests/test_phase2.py -v
```
*Note: The test suite includes a robust teardown fixture that automatically wipes the test user and records after execution to maintain idempotency.*