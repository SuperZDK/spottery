from pydantic import BaseModel


class TeamOut(BaseModel):
    id: int
    name: str
    short_name: str | None
    logo_url: str | None
    league_id: int | None
    country: str | None

    model_config = {"from_attributes": True}


class LeagueOut(BaseModel):
    id: int
    name: str
    country: str | None
    season: str | None
    logo_url: str | None

    model_config = {"from_attributes": True}


class StandingOut(BaseModel):
    position: int
    team_id: int
    team_name: str
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int


class StatRowOut(BaseModel):
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int
    rank: int | None = None
    win_rate: float
