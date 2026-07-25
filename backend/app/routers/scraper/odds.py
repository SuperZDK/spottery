from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import ScraperOddsPush, OddsOut
from app.models import Odds, RawScrape
from app.dependencies import verify_scraper_api_key
from app.crud import create
import json

router = APIRouter(prefix="/scraper", tags=["scraper"], dependencies=[Depends(verify_scraper_api_key)])


@router.post("/odds", response_model=list[OddsOut])
async def push_odds(payload: ScraperOddsPush, db: AsyncSession = Depends(get_db)):
    created_odds = []
    for item in payload.odds:
        odds = await create(
            db,
            Odds,
            match_id=item.match_id,
            bookmaker=item.bookmaker,
            odds_type=item.odds_type,
            initial_home=item.initial_home,
            initial_draw=item.initial_draw,
            initial_away=item.initial_away,
            current_home=item.current_home,
            current_draw=item.current_draw,
            current_away=item.current_away,
        )
        created_odds.append(odds)
    await create(
        db,
        RawScrape,
        source="scraper_odds",
        raw_data=json.loads(payload.model_dump_json()),
    )
    return created_odds
