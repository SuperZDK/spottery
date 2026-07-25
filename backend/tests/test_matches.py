import pytest


@pytest.mark.anyio
async def test_list_matches_empty(client):
    response = await client.get("/matches")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.anyio
async def test_get_match_not_found(client):
    response = await client.get("/matches/999")
    assert response.status_code == 404


@pytest.mark.anyio
async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Football Analysis API is running"
