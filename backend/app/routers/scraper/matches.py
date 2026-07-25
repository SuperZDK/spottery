from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import ScraperMatchPush, MatchOut
from app.models import Match, RawScrape
from app.dependencies import verify_scraper_api_key
from app.crud import create
import json

router = APIRouter(prefix="/scraper", tags=["scraper"], dependencies=[Depends(verify_scraper_api_key)])


@router.post("/matches", response_model=list[MatchOut])
async def push_matches(payload: ScraperMatchPush, db: AsyncSession = Depends(get_db)):
    created_matches = []
    for item in payload.matches:
        match = await create(
            db,
            Match,
            home_team=item.home_team,
            away_team=item.away_team,
            home_score=item.home_score,
            away_score=item.away_score,
            half_score=item.half_score,
            match_time=item.match_time,
            status=item.status or "SCHEDULED",
            league=item.league,
            league_id=item.league_id,
            home_team_id=item.home_team_id,
            away_team_id=item.away_team_id,
        )
        created_matches.append(match)
    await create(
        db,
        RawScrape,
        source="scraper_matches",
        raw_data=json.loads(payload.model_dump_json()),
    )
    return created_matches
