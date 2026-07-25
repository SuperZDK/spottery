from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas import AnalysisOut, H2HOut, FormOut, MatchOut
from app.models import Match
from app.crud import get_by_id, get_all

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/matches/{match_id}/analysis", response_model=AnalysisOut)
async def get_match_analysis(match_id: int, db: AsyncSession = Depends(get_db)):
    match = await get_by_id(db, Match, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return AnalysisOut(
        match_id=match_id,
        prediction=None,
        confidence=None,
        analysis_data={"home_team": match.home_team, "away_team": match.away_team, "league": match.league},
    )


@router.get("/h2h", response_model=H2HOut)
async def get_h2h(
    team1_id: int = Query(...),
    team2_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    matches = await get_all(
        db, Match,
        filters={"home_team_id": team1_id, "away_team_id": team2_id, "status": "FINISHED"},
    )
    team1_wins = sum(1 for m in matches if (m.home_team_id == team1_id and m.home_score is not None and m.away_score is not None and m.home_score > m.away_score) or (m.away_team_id == team1_id and m.home_score is not None and m.away_score is not None and m.away_score > m.home_score))
    team2_wins = sum(1 for m in matches if (m.home_team_id == team2_id and m.home_score is not None and m.away_score is not None and m.home_score > m.away_score) or (m.away_team_id == team2_id and m.home_score is not None and m.away_score is not None and m.away_score > m.home_score))
    draws = len(matches) - team1_wins - team2_wins
    return H2HOut(
        team1_id=team1_id,
        team2_id=team2_id,
        matches=[MatchOut.model_validate(m) for m in matches],
        team1_wins=team1_wins,
        team2_wins=team2_wins,
        draws=draws,
    )


@router.get("/teams/{team_id}/form", response_model=FormOut)
async def get_team_form(team_id: int, db: AsyncSession = Depends(get_db)):
    home_matches = await get_all(db, Match, filters={"home_team_id": team_id, "status": "FINISHED"}, order_by="match_time")
    away_matches = await get_all(db, Match, filters={"away_team_id": team_id, "status": "FINISHED"}, order_by="match_time")
    all_matches = sorted(home_matches + away_matches, key=lambda m: m.match_time, reverse=True)[:10]
    form_parts = []
    for m in all_matches:
        if m.home_score is not None and m.away_score is not None:
            if (m.home_team_id == team_id and m.home_score > m.away_score) or (m.away_team_id == team_id and m.away_score > m.home_score):
                form_parts.append("W")
            elif m.home_score == m.away_score:
                form_parts.append("D")
            else:
                form_parts.append("L")
    team_name = all_matches[0].home_team if all_matches and all_matches[0].home_team_id == team_id else (all_matches[0].away_team if all_matches else "")
    return FormOut(
        team_id=team_id,
        team_name=team_name,
        recent_matches=[MatchOut.model_validate(m) for m in all_matches],
        form_string="".join(form_parts),
    )
