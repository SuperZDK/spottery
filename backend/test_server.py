"""Quick test: start server, verify health endpoint, then test register/login."""
import multiprocessing
import time
import urllib.request
import json


def run_server():
    import uvicorn
    from app.main import app
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


if __name__ == "__main__":
    p = multiprocessing.Process(target=run_server, daemon=True)
    p.start()
    time.sleep(5)

    # 1. Health
    r = urllib.request.urlopen("http://localhost:8000/api/v1/health")
    print("HEALTH:", r.read().decode())

    # 2. Register
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/auth/register",
        data=json.dumps({"username": "test", "password": "test123"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        r = urllib.request.urlopen(req)
        print("REGISTER:", r.read().decode())
    except urllib.error.HTTPError as e:
        print("REGISTER ERROR:", e.code, e.read().decode())

    # 3. Login
    req = urllib.request.Request(
        "http://localhost:8000/api/v1/auth/login",
        data=json.dumps({"username": "test", "password": "test123"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    r = urllib.request.urlopen(req)
    data = json.loads(r.read().decode())
    token = data["access_token"]
    print("LOGIN OK, token:", token[:20] + "...")

    # 4. GET /matches/betting (public)
    r = urllib.request.urlopen("http://localhost:8000/api/v1/matches/betting")
    print("BETTING:", r.read().decode()[:120] + "...")

    # 5. GET /leagues (public)
    r = urllib.request.urlopen("http://localhost:8000/api/v1/leagues")
    print("LEAGUES:", r.read().decode()[:120] + "...")

    # 6. Auth-protected: /teams
    req = urllib.request.Request("http://localhost:8000/api/v1/teams")
    req.add_header("Authorization", f"Bearer {token}")
    try:
        r = urllib.request.urlopen(req)
        print("TEAMS:", r.read().decode()[:120] + "...")
    except urllib.error.HTTPError as e:
        print("TEAMS ERROR:", e.code, e.read().decode())

    p.terminate()
    print("DONE")
