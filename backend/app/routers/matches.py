import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.match import Match
from app.models.team import Team
from app.models.league import League
from app.models.odds import OddsHistory
from app.models.injury import Injury
from app.models.prediction import Prediction
from app.models.briefing import Briefing
from app.schemas.match import MatchOut, BettingResponse, BettingMatchOut, BetOptionOut, MatchComparisonOut, TeamComparisonOut
from app.schemas.odds import OddsItemOut, OddsHistoryOut, OddsHistoryPointOut
from app.schemas.analysis import PredictionOut, BriefingOut, H2HRecordOut, TeamFormOut, FormResultOut, MatchInjuriesOut, InjuryPlayerOut
from app.schemas.team import StandingOut

WEEKDAYS_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

router = APIRouter(tags=["matches"])


# ── helpers ─────────────────────────────────────────────────────────
def _tn(db: Session, tid: int) -> str:
    t = db.query(Team).filter(Team.id == tid).first()
    return t.name if t else "未知"


def _ln(db: Session, lid: int | None) -> str:
    if lid is None:
        return "未知"
    l = db.query(League).filter(League.id == lid).first()
    return l.name if l else "未知"


# ── Standings (computed from finished matches) ──────────────────────
def _compute_standings(league_id: int, db: Session) -> list[dict]:
    finished = db.query(Match).filter(
        Match.league_id == league_id,
        Match.status == "FINISHED",
    ).all()

    stats: dict[int, dict] = {}
    for m in finished:
        for tid in (m.home_team_id, m.away_team_id):
            if tid not in stats:
                stats[tid] = {"played": 0, "wins": 0, "draws": 0, "losses": 0, "gf": 0, "ga": 0}

        stats[m.home_team_id]["played"] += 1
        stats[m.away_team_id]["played"] += 1
        stats[m.home_team_id]["gf"] += m.home_score or 0
        stats[m.home_team_id]["ga"] += m.away_score or 0
        stats[m.away_team_id]["gf"] += m.away_score or 0
        stats[m.away_team_id]["ga"] += m.home_score or 0

        if m.home_score is not None and m.away_score is not None:
            if m.home_score > m.away_score:
                stats[m.home_team_id]["wins"] += 1
                stats[m.away_team_id]["losses"] += 1
            elif m.home_score == m.away_score:
                stats[m.home_team_id]["draws"] += 1
                stats[m.away_team_id]["draws"] += 1
            else:
                stats[m.home_team_id]["losses"] += 1
                stats[m.away_team_id]["wins"] += 1

    rows = []
    for tid, s in stats.items():
        team = db.query(Team).filter(Team.id == tid).first()
        rows.append({
            "team_id": tid,
            "team_name": team.name if team else "未知",
            "played": s["played"],
            "wins": s["wins"],
            "draws": s["draws"],
            "losses": s["losses"],
            "goals_for": s["gf"],
            "goals_against": s["ga"],
            "goal_diff": s["gf"] - s["ga"],
            "points": s["wins"] * 3 + s["draws"],
        })

    rows.sort(key=lambda r: (-r["points"], -(r["goals_for"] - r["goals_against"]), -r["goals_for"]))
    for i, r in enumerate(rows, 1):
        r["position"] = i

    return rows


@router.get("/leagues/{league_id}/standings", response_model=list[StandingOut])
def get_standings(league_id: int, db: Session = Depends(get_db)):
    return _compute_standings(league_id, db)


# ── Betting (public) ────────────────────────────────────────────────
def _get_latest_odds(match_id: int, db: Session) -> tuple:
    latest = db.query(OddsHistory).filter(
        OddsHistory.match_id == match_id,
    ).order_by(OddsHistory.snapshot_at.desc()).all()

    spf = {"home": None, "draw": None, "away": None}
    rqspf = {"handicap": None, "home": None, "draw": None, "away": None}
    bf = []
    zjq = []
    bqc = []

    for o in latest:
        if o.bookmaker == "竞彩":
            if o.odds_type == "SPF" and spf["home"] is None:
                spf = {"home": o.home_odds, "draw": o.draw_odds, "away": o.away_odds}
            elif o.odds_type == "RQSPF" and rqspf["home"] is None:
                rqspf = {"handicap": o.handicap, "home": o.home_odds, "draw": o.draw_odds, "away": o.away_odds}
            elif o.odds_type == "BF" and not bf:
                if o.options:
                    bf = [{"label": k, "odds": v} for k, v in json.loads(o.options).items()]
            elif o.odds_type == "ZJQ" and not zjq:
                if o.options:
                    zjq = [{"label": k, "odds": v} for k, v in json.loads(o.options).items()]
            elif o.odds_type == "BQC" and not bqc:
                if o.options:
                    bqc = [{"label": k, "odds": v} for k, v in json.loads(o.options).items()]

    return spf, rqspf, bf, zjq, bqc


@router.get("/matches/betting", response_model=BettingResponse)
def betting_matches(date_str: str | None = Query(None, alias="date"), db: Session = Depends(get_db)):
    target = date.fromisoformat(date_str) if date_str else date.today()
    weekday = WEEKDAYS_CN[target.weekday()]

    matches = db.query(Match).filter(
        func.date(Match.match_time) == target.isoformat(),
        Match.status.in_(["SCHEDULED", "LIVE"]),
    ).all()

    result = []
    for i, m in enumerate(matches):
        spf, rqspf, bf, zjq, bqc = _get_latest_odds(m.id, db)
        result.append(BettingMatchOut(
            match_id=m.id,
            home_team=_tn(db, m.home_team_id),
            away_team=_tn(db, m.away_team_id),
            match_time=m.match_time,
            league=_ln(db, m.league_id),
            league_id=m.league_id or 0,
            status=m.status,
            home_team_id=m.home_team_id or 0,
            away_team_id=m.away_team_id or 0,
            home_score=m.home_score,
            away_score=m.away_score,
            betting_code=f"{weekday}{str(i + 1).zfill(3)}",
            spf=spf,
            rqspf=rqspf,
            bf=[BetOptionOut(**b) for b in bf],
            zjq=[BetOptionOut(**b) for b in zjq],
            bqc=[BetOptionOut(**b) for b in bqc],
        ))

    return BettingResponse(date=target.isoformat(), weekday=weekday, matches=result)


# ── Match list (auth) ───────────────────────────────────────────────
@router.get("/matches", response_model=list[MatchOut])
def list_matches(
    league: str | None = None,
    status: str | None = None,
    date: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Match)
    if league:
        league_obj = db.query(League).filter(League.name == league).first()
        if league_obj:
            q = q.filter(Match.league_id == league_obj.id)
    if status:
        q = q.filter(Match.status == status)
    if date:
        q = q.filter(func.date(Match.match_time) == date)
    matches = q.all()

    out = []
    for m in matches:
        hs = m.home_score
        as_ = m.away_score
        half = f"{m.half_home_score}:{m.half_away_score}" if m.half_home_score is not None else None
        out.append(MatchOut(
            id=m.id,
            home_team=_tn(db, m.home_team_id),
            away_team=_tn(db, m.away_team_id),
            home_score=hs,
            away_score=as_,
            half_score=half,
            match_time=m.match_time,
            status=m.status,
            league=_ln(db, m.league_id),
            league_id=m.league_id,
            home_team_id=m.home_team_id,
            away_team_id=m.away_team_id,
        ))
    return out


@router.get("/matches/{match_id}", response_model=MatchOut)
def get_match(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(Match).filter(Match.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    half = f"{m.half_home_score}:{m.half_away_score}" if m.half_home_score is not None else None
    return MatchOut(
        id=m.id,
        home_team=_tn(db, m.home_team_id),
        away_team=_tn(db, m.away_team_id),
        home_score=m.home_score,
        away_score=m.away_score,
        half_score=half,
        match_time=m.match_time,
        status=m.status,
        league=_ln(db, m.league_id),
        league_id=m.league_id,
        home_team_id=m.home_team_id,
        away_team_id=m.away_team_id,
    )


# ── Odds ────────────────────────────────────────────────────────────
@router.get("/matches/{match_id}/odds", response_model=list[OddsItemOut])
def get_odds(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(
        OddsHistory.bookmaker,
        OddsHistory.odds_type,
        func.max(OddsHistory.snapshot_at).label("max_time"),
    ).filter(
        OddsHistory.match_id == match_id,
    ).group_by(
        OddsHistory.bookmaker, OddsHistory.odds_type,
    ).subquery()

    first_sub = db.query(
        OddsHistory.bookmaker,
        OddsHistory.odds_type,
        func.min(OddsHistory.snapshot_at).label("min_time"),
    ).filter(
        OddsHistory.match_id == match_id,
    ).group_by(
        OddsHistory.bookmaker, OddsHistory.odds_type,
    ).subquery()

    latest = db.query(OddsHistory).join(
        sub,
        (OddsHistory.bookmaker == sub.c.bookmaker) &
        (OddsHistory.odds_type == sub.c.odds_type) &
        (OddsHistory.snapshot_at == sub.c.max_time),
    ).all()

    initial = db.query(OddsHistory).join(
        first_sub,
        (OddsHistory.bookmaker == first_sub.c.bookmaker) &
        (OddsHistory.odds_type == first_sub.c.odds_type) &
        (OddsHistory.snapshot_at == first_sub.c.min_time),
    ).all()

    init_map = {}
    for i in initial:
        init_map[(i.bookmaker, i.odds_type)] = i

    result = []
    for idx, l in enumerate(latest):
        init = init_map.get((l.bookmaker, l.odds_type))
        result.append(OddsItemOut(
            id=idx + 1,
            match_id=match_id,
            bookmaker=l.bookmaker,
            odds_type=l.odds_type,
            initial_home=init.home_odds if init else None,
            initial_draw=init.draw_odds if init else None,
            initial_away=init.away_odds if init else None,
            current_home=l.home_odds,
            current_draw=l.draw_odds,
            current_away=l.away_odds,
            update_time=l.snapshot_at,
        ))

    return result


@router.get("/matches/{match_id}/odds/history", response_model=OddsHistoryOut)
def get_odds_history(
    match_id: int,
    bookmaker: str = "竞彩",
    odds_type: str = "SPF",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(OddsHistory).filter(
        OddsHistory.match_id == match_id,
        OddsHistory.bookmaker == bookmaker,
        OddsHistory.odds_type == odds_type,
    ).order_by(OddsHistory.snapshot_at.asc()).all()

    history = []
    for r in records:
        opts = None
        if r.options:
            try:
                opts = json.loads(r.options)
            except Exception:
                pass
        history.append(OddsHistoryPointOut(
            time=r.snapshot_at,
            home=r.home_odds,
            draw=r.draw_odds,
            away=r.away_odds,
            handicap=r.handicap,
            options=opts,
        ))

    return OddsHistoryOut(match_id=match_id, bookmaker=bookmaker, odds_type=odds_type, history=history)


# ── Prediction ──────────────────────────────────────────────────────
@router.get("/matches/{match_id}/analysis", response_model=PredictionOut)
def get_prediction(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = db.query(Prediction).filter(Prediction.match_id == match_id).first()
    if not p:
        return PredictionOut(match_id=match_id, home_prob=40, draw_prob=30, away_prob=30, confidence=60, model_version="v1.0", predicted_result="待定")
    return p


# ── Briefing (public) ───────────────────────────────────────────────
@router.get("/matches/{match_id}/briefing", response_model=BriefingOut)
def get_briefing(match_id: int, db: Session = Depends(get_db)):
    b = db.query(Briefing).filter(Briefing.match_id == match_id).first()
    if not b:
        return BriefingOut(match_id=match_id, content="暂无赛前简报")
    return b


# ── H2H ─────────────────────────────────────────────────────────────
@router.get("/analysis/h2h", response_model=list[H2HRecordOut])
def get_h2h(team1_id: int, team2_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    matches = db.query(Match).filter(
        Match.status == "FINISHED",
        (
            ((Match.home_team_id == team1_id) & (Match.away_team_id == team2_id)) |
            ((Match.home_team_id == team2_id) & (Match.away_team_id == team1_id))
        ),
    ).order_by(Match.match_time.desc()).limit(20).all()

    result = []
    for m in matches:
        result.append(H2HRecordOut(
            match_id=m.id,
            home_team=_tn(db, m.home_team_id),
            away_team=_tn(db, m.away_team_id),
            home_score=m.home_score,
            away_score=m.away_score,
            match_time=m.match_time,
            league=_ln(db, m.league_id),
        ))
    return result


# ── Team form ───────────────────────────────────────────────────────
@router.get("/analysis/teams/{team_id}/form", response_model=TeamFormOut)
def get_team_form(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = db.query(Team).filter(Team.id == team_id).first()
    team_name = team.name if team else "未知"

    matches = db.query(Match).filter(
        Match.status == "FINISHED",
        (Match.home_team_id == team_id) | (Match.away_team_id == team_id),
    ).order_by(Match.match_time.desc()).limit(10).all()

    results = []
    for m in matches:
        is_home = m.home_team_id == team_id
        if is_home:
            result = "W" if (m.home_score or 0) > (m.away_score or 0) else "D" if m.home_score == m.away_score else "L"
            opponent = _tn(db, m.away_team_id)
            score = f"{m.home_score}:{m.away_score}" if m.home_score is not None else "-:-"
        else:
            result = "W" if (m.away_score or 0) > (m.home_score or 0) else "D" if m.home_score == m.away_score else "L"
            opponent = _tn(db, m.home_team_id)
            score = f"{m.away_score}:{m.home_score}" if m.away_score is not None else "-:-"

        results.append(FormResultOut(
            match_id=m.id,
            result=result,
            home=is_home,
            opponent=opponent,
            score=score,
            match_time=m.match_time,
        ))

    return TeamFormOut(team_id=team_id, team_name=team_name, results=results)


# ── Statistics helper ───────────────────────────────────────────────
def _calc_stat_row(matches: list[Match], team_id: int, rank: int | None = None) -> dict:
    wins = draws = losses = gf = ga = 0
    for m in matches:
        is_home = m.home_team_id == team_id
        hs = m.home_score or 0
        aws = m.away_score or 0
        if is_home:
            if hs > aws:
                wins += 1
            elif hs == aws:
                draws += 1
            else:
                losses += 1
            gf += hs
            ga += aws
        else:
            if aws > hs:
                wins += 1
            elif aws == hs:
                draws += 1
            else:
                losses += 1
            gf += aws
            ga += hs
    played = wins + draws + losses
    points = wins * 3 + draws
    win_rate = round((wins / max(played, 1)) * 100, 1)
    return {
        "played": played,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "goals_for": gf,
        "goals_against": ga,
        "goal_diff": gf - ga,
        "points": points,
        "rank": rank,
        "win_rate": win_rate,
    }


def _build_team_comparison(team_id: int, league_id: int, db: Session, standings: list) -> dict:
    team = db.query(Team).filter(Team.id == team_id).first()
    league = db.query(League).filter(League.id == league_id).first()
    team_name = team.name if team else "未知"
    league_name = league.name if league else ""

    standing = next((s for s in standings if s["team_id"] == team_id), None)
    rank = standing["position"] if standing else None

    all_finished = db.query(Match).filter(
        Match.league_id == league_id,
        Match.status == "FINISHED",
        (Match.home_team_id == team_id) | (Match.away_team_id == team_id),
    ).order_by(Match.match_time.desc()).all()

    home_matches = [m for m in all_finished if m.home_team_id == team_id]
    away_matches = [m for m in all_finished if m.away_team_id == team_id]
    recent6 = all_finished[:6]

    return {
        "league_label": f"[{league_name}-{rank}]" if rank and league_name else "",
        "team_name": team_name,
        "fulltime": {
            "total": _calc_stat_row(all_finished, team_id, rank=rank),
            "home": _calc_stat_row(home_matches, team_id),
            "away": _calc_stat_row(away_matches, team_id),
            "recent6": _calc_stat_row(recent6, team_id),
        },
        "halftime": {
            "total": _calc_stat_row(all_finished, team_id, rank=rank),
            "home": _calc_stat_row(home_matches, team_id),
            "away": _calc_stat_row(away_matches, team_id),
            "recent6": _calc_stat_row(recent6, team_id),
        },
    }


@router.get("/matches/{match_id}/comparison", response_model=MatchComparisonOut)
def get_comparison(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(Match).filter(Match.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")

    standings = _compute_standings(m.league_id or 0, db)
    home = _build_team_comparison(m.home_team_id, m.league_id or 0, db, standings)
    away = _build_team_comparison(m.away_team_id, m.league_id or 0, db, standings)

    return MatchComparisonOut(match_id=match_id, home=TeamComparisonOut(**home), away=TeamComparisonOut(**away))


# ── Injuries ────────────────────────────────────────────────────────
@router.get("/matches/{match_id}/injuries", response_model=MatchInjuriesOut)
def get_injuries(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = db.query(Injury).filter(Injury.match_id == match_id).all()
    home = [InjuryPlayerOut(name=r.player_name, position=r.position or "", tag=r.tag) for r in records if r.team_type == "home"]
    away = [InjuryPlayerOut(name=r.player_name, position=r.position or "", tag=r.tag) for r in records if r.team_type == "away"]
    return MatchInjuriesOut(match_id=match_id, home=home, away=away)
