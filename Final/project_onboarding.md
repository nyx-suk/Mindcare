# MindCare: Developer Onboarding Handbook
**Welcome to the MindCare Engineering Team!**  
This document serves as your quick-start guide, architectural directory, and runtime reference manual. It will help you go from cloning the repository to running a fully authenticated local client-server loop in less than 15 minutes.

---

## 🛠️ 1. Technical Stack & Core Versions

Before initializing your environment, ensure you meet the system prerequisites:
*   **Operating System:** Windows 10/11 (PowerShell recommended)
*   **Runtimes:** Node.js v18+ (LTS) & Python 3.10+ (installed & added to system PATH)
*   **Containers:** Docker Desktop active (for PostgreSQL instances)

### Version Matrix (Strict Compliance Required)
To prevent build breaking, the codebase enforces these exact packages. Do not upgrade these versions without team approval:

| Component | Technology | Version / Specification | Details |
| :--- | :--- | :--- | :--- |
| **Frontend** | React Native (Expo) | **Expo SDK 55** | Managed Expo Workflow |
| | React / React Native | **React 19.2.0** / **React Native 0.83.6** | Locked versions |
| | State Management | **Redux Toolkit** | Centralized in `src/store/` |
| | Navigation | **React Navigation** | Stack + Tab Navigators |
| **Backend** | API Engine | **FastAPI** (Python 3.10+) | Server-side scoring |
| | Database Mapper | **SQLAlchemy** (ORM) | PostgreSQL driver |
| | Security | **Passlib (PBKDF2)** & **PyJWT** | HIPAA-compliant cryptography |
| **Database** | RDBMS | **PostgreSQL 15** | Standard relational database |

---

## 📂 2. Repository Directory Map

Here is a map of the repository's directories to help you find your way around:

```
app_01/
├── .venv/                      # Shared Python Virtual Environment
├── Documents/                  # Design schemas, plans, and historical logs
│   ├── Final/                  # ◄ YOU ARE HERE: Core onboarding & walkthroughs
├── MentalHealthApp/            # Main Project Directory
│   ├── backend/                # FastAPI backend code
│   │   ├── main.py             # FastAPI entrypoint, routes, and security middleware
│   │   └── models.py           # SQLAlchemy database tables and relationships
│   ├── src/                    # Expo React Native frontend code
│   │   ├── __tests__/          # Frontend Jest UI/component unit tests
│   │   ├── api/                # Axios API clients & interceptors
│   │   ├── components/         # Styled atomic inputs & animated primary buttons
│   │   ├── navigation/         # Navigators (Auth Stack & Main App Tabs)
│   │   ├── screens/            # Home, Assessment, Mood, Welcome, Login, Register
│   │   ├── store/              # Redux slices (authSlice, assessmentSlice)
│   │   └── theme/              # Global Design Tokens & calming colors
│   ├── tests/                  # Backend Pytest integration and security tests
│   ├── docker-compose.yml      # Local PostgreSQL container specification
│   ├── package.json            # Node dependencies and Expo script configs
│   └── requirements.txt        # Python backend package dependencies
```

---

## ⚡ 3. Quick-Start Guide (Step-by-Step local launch)

Follow these steps to boot the entire local stack on a Windows machine.

### Step 1: Launch the PostgreSQL Database
MindCare requires an active PostgreSQL database. We provide a pre-configured Docker Compose file:
```powershell
# Run from the repository root or MentalHealthApp directory
docker-compose up -d
```
*This starts a local PostgreSQL instance running at `localhost:5432` with database `mindcare_db`, user `mindcare_user`, and password `mindcare_pass`.*

### Step 2: Set Up and Boot the FastAPI Backend
1. Open a PowerShell terminal and navigate to the `MentalHealthApp` directory:
   ```powershell
   cd MentalHealthApp
   ```
2. Activate the pre-configured virtual environment and verify package dependencies:
   ```powershell
   # Activate Python environment
   ..\.venv\Scripts\Activate.ps1
   
   # Confirm packages match requirements
   pip install -r requirements.txt
   ```
3. Set your local environment variables and start the server using `uvicorn`:
   ```powershell
   # Configure development variables
   $env:DATABASE_URL="postgresql://mindcare_user:mindcare_pass@localhost:5432/mindcare_db"
   $env:SECRET_KEY="local_dev_secret_key_change_in_production"
   $env:HF_API_TOKEN="your_huggingface_token_here" # (Optional: falls back gracefully if omitted)
   
   # Start the uvicorn engine with hot-reload enabled
   python -m uvicorn backend.main:app --reload
   ```
*The API server will launch at `http://127.0.0.1:8000`. You can test endpoints interactively by navigating to `http://127.0.0.1:8000/docs` in your browser.*

### Step 3: Run the React Native Mobile Application
1. Open a **second** PowerShell session and navigate to the `MentalHealthApp` directory:
   ```powershell
   cd MentalHealthApp
   ```
2. Install the necessary Node packages matching the pinned Expo SDK:
   ```powershell
   npm install
   ```
3. Boot the development bundler using the secure **tunnel utility** to bridge Windows emulator interfaces cleanly:
   ```powershell
   npm start -- --tunnel
   ```
*This generates a QR code in the terminal. Open the **Expo Go** application on your physical Android or iOS device and scan it, or press `a` to boot the application directly inside an active Android emulator.*

---

## 🛡️ 4. Strict Engineering Constraints & Standards

To maintain compliance and avoid breaking builds, follow these guidelines when writing code:

> [!IMPORTANT]
> **1. Server-Side Calculations Only**
> Never calculate assessment scores (anxiety or depression values) on the React Native client. All response calculations must occur strictly on the backend and persist as calculated scores to ensure data reliability and security.
> 
> **2. High-Risk Safety Defenses**
> Ensure the safety scoring logic is maintained: if a submitted assessment triggers a high-severity score threshold on the backend, it will mark the response as high-risk, which triggers a prominent, red "Connect to Crisis Support" action in the UI.
> 
> **3. HIPAA-Grade Sensitive Storage**
> Never store auth tokens, credentials, or sensitive demographic logs inside standard `AsyncStorage` (which saves data as plaintext). Always write sensitive values to secure hardware storage using `react-native-keychain`.
> 
> **4. Strict Version Installs**
> Never use standard `npm install` for frontend packages. Always run `npx expo install <package-name>` so Expo resolves version-compatible peer dependencies under SDK 55.

---

## 🧪 5. Testing & Operations Command Reference

MindCare utilizes dual test pipelines to secure both frontend components and backend relational structures.

```
                  MindCare Test Runner Matrix
  ┌────────────────────────────────────────────────────────┐
  │  Component | command                                   │
  ├────────────────────────────────────────────────────────┤
  │  Backend   | ..\.venv\Scripts\pytest tests/            │
  │  Frontend  | npm test                                  │
  └────────────────────────────────────────────────────────┘
```

### Run Backend Integration Tests (Pytest)
Ensure your environment variables are configured before running pytest. In a new PowerShell window, run:
```powershell
cd MentalHealthApp
..\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql://mindcare_user:mindcare_pass@localhost:5432/mindcare_db"
$env:SECRET_KEY="local_dev_secret_key_change_in_production"
pytest tests/
```
*This will execute all 64 backend tests, confirming endpoint configurations, JWT validation, database cascade behaviors, and index creation.*

### Run Frontend Component Tests (Jest)
To run Jest test cases and inspect UI styling rendering:
```powershell
cd MentalHealthApp
npm test
```
*Executes all 49 React Native Testing Library tests, including keyboard behavior and screen validation loops.*

### Database Administrative Utilities
If you need to clear manual test records or clean up duplicate registration buffers, run our database cleanup utility:
```powershell
cd MentalHealthApp
..\.venv\Scripts\Activate.ps1
python cleanup_test_users.py
```
*This script safely deletes transient test records from PostgreSQL, leaving production and core configuration records intact.*
