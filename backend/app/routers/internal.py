import json

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.match import Match, MatchSourceMapping
from app.models.odds import OddsHistory
from app.schemas.analysis import UpsertMatchRequest, OddsSnapshotRequest

router = APIRouter(prefix="/internal", tags=["internal"])


def _verify_internal_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.jwt_secret_key:
        raise HTTPException(status_code=403, detail="Invalid internal token")
    return True


@router.post("/matches/upsert")
def upsert_match(body: UpsertMatchRequest, db: Session = Depends(get_db), _=Depends(_verify_internal_token)):
    mapping = db.query(MatchSourceMapping).filter(
        MatchSourceMapping.source == body.source,
        MatchSourceMapping.source_id == body.source_id,
    ).first()

    if mapping:
        match = db.query(Match).filter(Match.id == mapping.match_id).first()
        if match:
            match.match_time = body.match_time
            match.status = body.status
            if body.home_score is not None:
                match.home_score = body.home_score
            if body.away_score is not None:
                match.away_score = body.away_score
            if body.round is not None:
                match.round = body.round
            db.commit()
            return {"match_id": match.id, "action": "updated"}
        else:
            db.delete(mapping)
            db.commit()

    match = Match(
        league_id=body.league_id,
        home_team_id=body.home_team_id,
        away_team_id=body.away_team_id,
        match_time=body.match_time,
        status=body.status,
        home_score=body.home_score,
        away_score=body.away_score,
        round=body.round,
    )
    db.add(match)
    db.flush()

    mapping = MatchSourceMapping(
        match_id=match.id,
        source=body.source,
        source_id=body.source_id,
    )
    db.add(mapping)
    db.commit()
    db.refresh(match)

    return {"match_id": match.id, "action": "created"}


@router.post("/odds/snapshot")
def create_odds_snapshot(body: OddsSnapshotRequest, db: Session = Depends(get_db), _=Depends(_verify_internal_token)):
    options_str = json.dumps(body.options, ensure_ascii=False) if body.options else None
    snapshot = OddsHistory(
        match_id=body.match_id,
        bookmaker=body.bookmaker,
        odds_type=body.odds_type,
        snapshot_at=body.snapshot_at,
        home_odds=body.home_odds,
        draw_odds=body.draw_odds,
        away_odds=body.away_odds,
        handicap=body.handicap,
        options=options_str,
    )
    db.add(snapshot)
    db.commit()
    return {"id": snapshot.id}
