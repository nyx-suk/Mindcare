"""
tests/test_deployment.py — Live smoke test for the MindCare API on Render.

Usage:
    # Option A: pass URL as env var
    set RENDER_URL=https://mindcare-api.onrender.com
    set RENDER_DB_URL=postgresql://user:pass@host/db   # External DB URL from Render dashboard
    python tests/test_deployment.py

    # Option B: edit the two constants below directly
"""

import os
import sys
import time
import uuid

import httpx
import psycopg2

# ── Configuration ────────────────────────────────────────────────────────────

RENDER_URL: str = os.environ.get(
    "RENDER_URL", "https://mindcare-api.onrender.com"
).rstrip("/")

# Get this from Render Dashboard → mindcare-db → "External Database URL"
RENDER_DB_URL: str | None = os.environ.get("RENDER_DB_URL")

# Unique test account so parallel runs don't collide
_RUN_ID = uuid.uuid4().hex[:8]
TEST_EMAIL = f"smoke_{_RUN_ID}@test.invalid"
TEST_PASSWORD = "SmokeTest1!"

# Timeout generous enough to survive a cold-start spin-up (~30 s on free tier)
TIMEOUT = httpx.Timeout(60.0, connect=60.0)

# ── Helpers ───────────────────────────────────────────────────────────────────

_PASS = "\033[92mPASS\033[0m"
_FAIL = "\033[91mFAIL\033[0m"
_results: list[bool] = []


def _report(step: str, passed: bool, ms: float, detail: str = "") -> None:
    label = _PASS if passed else _FAIL
    detail_str = f"  ↳ {detail}" if detail else ""
    print(f"  [{label}] {step} ({ms:.0f} ms){detail_str}")
    _results.append(passed)


def _get(client: httpx.Client, path: str, step: str, **kwargs) -> httpx.Response | None:
    url = f"{RENDER_URL}{path}"
    t0 = time.perf_counter()
    try:
        r = client.get(url, **kwargs)
        ms = (time.perf_counter() - t0) * 1000
        passed = r.status_code == 200
        _report(step, passed, ms, f"HTTP {r.status_code}" if not passed else "")
        return r
    except Exception as exc:
        ms = (time.perf_counter() - t0) * 1000
        _report(step, False, ms, str(exc))
        return None


def _post(client: httpx.Client, path: str, step: str, expect: int = 200, **kwargs) -> httpx.Response | None:
    url = f"{RENDER_URL}{path}"
    t0 = time.perf_counter()
    try:
        r = client.post(url, **kwargs)
        ms = (time.perf_counter() - t0) * 1000
        passed = r.status_code == expect
        detail = ""
        if not passed:
            detail = f"HTTP {r.status_code} — {r.text[:120]}"
        _report(step, passed, ms, detail)
        return r
    except Exception as exc:
        ms = (time.perf_counter() - t0) * 1000
        _report(step, False, ms, str(exc))
        return None


# ── Cleanup ───────────────────────────────────────────────────────────────────

def _delete_test_user(email: str) -> None:
    step = "Cleanup — DELETE test user from DB"
    if not RENDER_DB_URL:
        print(f"  [SKIP] {step}  ↳ RENDER_DB_URL not set — delete manually")
        return

    t0 = time.perf_counter()
    try:
        conn = psycopg2.connect(RENDER_DB_URL, connect_timeout=10)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE email = %s", (email,))
            deleted = cur.rowcount
        conn.close()
        ms = (time.perf_counter() - t0) * 1000
        _report(step, True, ms, f"{deleted} row(s) removed")
    except Exception as exc:
        ms = (time.perf_counter() - t0) * 1000
        _report(step, False, ms, str(exc))


# ── Test suite ────────────────────────────────────────────────────────────────

def run() -> None:
    print(f"\n{'─' * 58}")
    print(f"  MindCare API — Deployment Smoke Test")
    print(f"  Target : {RENDER_URL}")
    print(f"  Account: {TEST_EMAIL}")
    print(f"{'─' * 58}\n")

    with httpx.Client(timeout=TIMEOUT) as client:

        # ── 1. Docs accessible ────────────────────────────────────────────────
        _get(client, "/docs", "GET /docs  (API docs accessible)")

        # ── 2. Health check ───────────────────────────────────────────────────
        r_health = _get(client, "/health", "GET /health  (service healthy)")
        if r_health and r_health.status_code == 200:
            body = r_health.json()
            if body.get("status") != "ok":
                # Override to FAIL — body malformed
                _results[-1] = False
                print(f"         ↳ Unexpected body: {body}")
            else:
                print(f"         ↳ timestamp: {body.get('timestamp')}")

        # ── 3. Register test account ──────────────────────────────────────────
        r_reg = _post(
            client,
            "/auth/register",
            "POST /auth/register  (new account + token returned)",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        token: str | None = None
        if r_reg and r_reg.status_code == 200:
            data = r_reg.json()
            token = data.get("token")
            if not token:
                _results[-1] = False
                print("         ↳ No token in response body")

        # ── 4. Login with same credentials ────────────────────────────────────
        r_login = _post(
            client,
            "/auth/login",
            "POST /auth/login  (token returned)",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        )
        if r_login and r_login.status_code == 200:
            login_token = r_login.json().get("token")
            if not login_token:
                _results[-1] = False
                print("         ↳ No token in login response")

        # ── 5. Authenticated endpoint sanity ──────────────────────────────────
        if token:
            _get(
                client,
                "/assessments/questions",
                "GET /assessments/questions  (auth not required — data returned)",
            )

    # ── 6. Cleanup ────────────────────────────────────────────────────────────
    _delete_test_user(TEST_EMAIL)

    # ── Summary ───────────────────────────────────────────────────────────────
    total = len(_results)
    passed = sum(_results)
    failed = total - passed

    print(f"\n{'─' * 58}")
    if failed == 0:
        print(f"  \033[92mAll {total} checks passed.\033[0m")
    else:
        print(f"  \033[91m{failed}/{total} check(s) FAILED.\033[0m")
    print(f"{'─' * 58}\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    run()
