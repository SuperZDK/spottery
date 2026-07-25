from datetime import datetime
from pydantic import BaseModel


class OddsItemOut(BaseModel):
    id: int
    match_id: int
    bookmaker: str
    odds_type: str
    initial_home: float | None
    initial_draw: float | None
    initial_away: float | None
    current_home: float | None
    current_draw: float | None
    current_away: float | None
    update_time: datetime

    model_config = {"from_attributes": True}


class OddsHistoryPointOut(BaseModel):
    time: datetime
    home: float | None
    draw: float | None
    away: float | None
    handicap: str | None = None
    options: dict | None = None


class OddsHistoryOut(BaseModel):
    match_id: int
    bookmaker: str
    odds_type: str
    history: list[OddsHistoryPointOut]
