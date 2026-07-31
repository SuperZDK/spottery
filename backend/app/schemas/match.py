from datetime import datetime
from pydantic import BaseModel

from app.schemas.odds import OddsHistoryPointOut
from app.schemas.analysis import H2HRecordOut, MatchInjuriesOut, PredictionOut, BriefingOut


class MatchOut(BaseModel):
    id: int
    home_team: str
    away_team: str
    home_score: int | None
    away_score: int | None
    half_score: str | None
    match_time: datetime
    status: str
    league: str
    league_id: int | None
    home_team_id: int | None
    away_team_id: int | None

    model_config = {"from_attributes": True}


class BetOptionOut(BaseModel):
    label: str
    odds: float


class BettingMatchOut(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    match_time: datetime
    league: str
    league_id: int
    status: str
    home_team_id: int
    away_team_id: int
    home_score: int | None
    away_score: int | None
    betting_code: str
    spf: dict
    rqspf: dict
    bf: list[BetOptionOut]
    zjq: list[BetOptionOut]
    bqc: list[BetOptionOut]


class BettingResponse(BaseModel):
    date: str
    weekday: str
    matches: list[BettingMatchOut]


class TeamComparisonOut(BaseModel):
    league_label: str
    team_name: str
    fulltime: dict
    halftime: dict


class MatchComparisonOut(BaseModel):
    match_id: int
    home: TeamComparisonOut
    away: TeamComparisonOut


class StandingSnapshotOut(BaseModel):
    view: str
    team_name: str
    position: int | None
    points: int | None
    played: int | None
    wins: int | None
    draws: int | None
    losses: int | None
    goals_for: int | None
    goals_against: int | None
    goal_diff: int | None


class MatchStandingsOut(BaseModel):
    home: list[StandingSnapshotOut]
    away: list[StandingSnapshotOut]


class MatchDetailOut(BaseModel):
    match: MatchOut
    standings: MatchStandingsOut
    comparison: MatchComparisonOut
    form: dict
    h2h: list[H2HRecordOut]
    injuries: MatchInjuriesOut
    odds: dict
    prediction: PredictionOut | None
    briefing: BriefingOut | None
    sentiment: None
