import pytest


@pytest.mark.anyio
async def test_register(client):
    response = await client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "FREE"
    assert "id" in data


@pytest.mark.anyio
async def test_register_duplicate(client):
    await client.post("/auth/register", json={
        "email": "dup@example.com",
        "password": "testpass123",
    })
    response = await client.post("/auth/register", json={
        "email": "dup@example.com",
        "password": "testpass123",
    })
    assert response.status_code == 400


@pytest.mark.anyio
async def test_login_success(client):
    await client.post("/auth/register", json={
        "email": "login@example.com",
        "password": "testpass123",
    })
    response = await client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "testpass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "email": "wrong@example.com",
        "password": "testpass123",
    })
    response = await client.post("/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrongpass",
    })
    assert response.status_code == 401
