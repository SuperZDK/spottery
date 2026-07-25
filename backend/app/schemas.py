from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MatchCreate(BaseModel):
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    match_time: datetime
    league: str
    status: Optional[str] = "SCHEDULED"


class MatchOut(MatchCreate):
    id: int
    status: str
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    league_id: Optional[int] = None

    model_config = {"from_attributes": True}


class OddsOut(BaseModel):
    id: int
    match_id: int
    bookmaker: str
    odds_type: str
    initial_home: Optional[float] = None
    initial_draw: Optional[float] = None
    initial_away: Optional[float] = None
    current_home: Optional[float] = None
    current_draw: Optional[float] = None
    current_away: Optional[float] = None
    update_time: datetime

    model_config = {"from_attributes": True}


class TeamOut(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    league_id: Optional[int] = None
    country: Optional[str] = None

    model_config = {"from_attributes": True}


class LeagueOut(BaseModel):
    id: int
    name: str
    country: Optional[str] = None
    season: Optional[str] = None
    logo_url: Optional[str] = None

    model_config = {"from_attributes": True}


class ScraperMatchItem(BaseModel):
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    half_score: Optional[str] = None
    match_time: datetime
    status: Optional[str] = "SCHEDULED"
    league: str
    league_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None


class ScraperMatchPush(BaseModel):
    matches: list[ScraperMatchItem]


class ScraperOddsItem(BaseModel):
    match_id: int
    bookmaker: str
    odds_type: str
    initial_home: Optional[float] = None
    initial_draw: Optional[float] = None
    initial_away: Optional[float] = None
    current_home: Optional[float] = None
    current_draw: Optional[float] = None
    current_away: Optional[float] = None


class ScraperOddsPush(BaseModel):
    odds: list[ScraperOddsItem]


class AnalysisOut(BaseModel):
    match_id: int
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    analysis_data: Optional[dict] = None


class H2HOut(BaseModel):
    team1_id: int
    team2_id: int
    matches: list[MatchOut]
    team1_wins: int
    team2_wins: int
    draws: int


class FormOut(BaseModel):
    team_id: int
    team_name: str
    recent_matches: list[MatchOut]
    form_string: str
