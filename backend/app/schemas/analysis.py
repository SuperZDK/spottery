from datetime import datetime
from pydantic import BaseModel


class PredictionOut(BaseModel):
    match_id: int
    home_prob: int
    draw_prob: int
    away_prob: int
    confidence: int
    model_version: str
    predicted_result: str


class BriefingOut(BaseModel):
    match_id: int
    content: str


class H2HRecordOut(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    home_score: int | None
    away_score: int | None
    match_time: datetime
    league: str
    home_spf: float | None = None
    draw_spf: float | None = None
    away_spf: float | None = None


class FormResultOut(BaseModel):
    match_id: int
    result: str
    home: bool
    opponent: str
    score: str
    match_time: datetime
    home_spf: float | None = None
    draw_spf: float | None = None
    away_spf: float | None = None


class TeamFormOut(BaseModel):
    team_id: int
    team_name: str
    results: list[FormResultOut]


class InjuryPlayerOut(BaseModel):
    name: str
    position: str
    tag: str | None


class MatchInjuriesOut(BaseModel):
    match_id: int
    home: list[InjuryPlayerOut]
    away: list[InjuryPlayerOut]


class UpsertMatchRequest(BaseModel):
    source: str
    source_id: str
    league_id: int
    home_team_id: int
    away_team_id: int
    match_time: datetime
    status: str = "SCHEDULED"
    home_score: int | None = None
    away_score: int | None = None
    round: int | None = None


class OddsSnapshotRequest(BaseModel):
    match_id: int
    bookmaker: str
    odds_type: str
    snapshot_at: datetime
    home_odds: float | None = None
    draw_odds: float | None = None
    away_odds: float | None = None
    handicap: str | None = None
    options: dict | None = None
