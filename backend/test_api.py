"""Integration tests using FastAPI TestClient."""
from fastapi.testclient import TestClient

from app.database import engine, Base
from app.main import app

# Create all tables before any test runs
Base.metadata.create_all(bind=engine)

client = TestClient(app)
_test_token: str = ""


def setup_module(module):
    Base.metadata.create_all(bind=engine)


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register():
    r = client.post("/api/v1/auth/register", json={"email": "test@test.com", "password": "test123"})
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "test@test.com"
    assert data["role"] == "FREE"


def test_register_duplicate():
    r = client.post("/api/v1/auth/register", json={"email": "test@test.com", "password": "test123"})
    assert r.status_code == 400
    assert "exists" in r.json()["detail"].lower()


def test_login():
    global _test_token
    r = client.post("/api/v1/auth/login", json={"email": "test@test.com", "password": "test123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    _test_token = data["access_token"]


def _token():
    return _test_token


def test_login_wrong_password():
    r = client.post("/api/v1/auth/login", json={"email": "test@test.com", "password": "wrong"})
    assert r.status_code == 401


def test_me():
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200
    assert r.json()["email"] == "test@test.com"


def test_me_no_auth():
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


def test_leagues_public():
    r = client.get("/api/v1/leagues")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_betting_public():
    r = client.get("/api/v1/matches/betting")
    assert r.status_code == 200
    data = r.json()
    assert "date" in data
    assert "matches" in data


def test_standings_public():
    r = client.get("/api/v1/leagues/1/standings")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_briefing_public():
    r = client.get("/api/v1/matches/1/briefing")
    assert r.status_code == 200
    data = r.json()
    assert data["match_id"] == 1


def test_teams_auth_required():
    r = client.get("/api/v1/teams", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_teams_no_auth():
    r = client.get("/api/v1/teams")
    assert r.status_code == 401


def test_match_detail_not_found():
    r = client.get("/api/v1/matches/1", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 404


def test_match_not_found():
    r = client.get("/api/v1/matches/99999", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 404


def test_odds():
    r = client.get("/api/v1/matches/1/odds", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_odds_history():
    r = client.get("/api/v1/matches/1/odds/history?bookmaker=竞彩&odds_type=SPF", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_h2h():
    r = client.get("/api/v1/analysis/h2h?team1_id=1&team2_id=2", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_injuries():
    r = client.get("/api/v1/matches/1/injuries", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_team_form():
    r = client.get("/api/v1/analysis/teams/1/form", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200


def test_comparison_not_found():
    r = client.get("/api/v1/matches/1/comparison", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 404


def test_prediction():
    r = client.get("/api/v1/matches/1/analysis", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200
