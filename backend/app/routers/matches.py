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
from app.models.jingcai import (
    JingcaiMatch, JingcaiTeam, JingcaiLeague, JingcaiOdds,
    JingcaiOddsSpf, JingcaiOddsRqspf, JingcaiOddsCrs, JingcaiOddsTtg, JingcaiOddsHafu,
    JingcaiStanding, JingcaiH2h, JingcaiRecentResult, JingcaiInjury, JingcaiSeasonFeature,
)
from app.schemas.match import (
    MatchOut, BettingResponse, BettingMatchOut, BetOptionOut,
    MatchComparisonOut, TeamComparisonOut,
    StandingSnapshotOut, MatchStandingsOut, MatchDetailOut,
)
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
@router.get("/matches/betting", response_model=BettingResponse)
def betting_matches(date_str: str | None = Query(None, alias="date"), db: Session = Depends(get_db)):
    target = date.fromisoformat(date_str) if date_str else date.today()
    weekday = WEEKDAYS_CN[target.weekday()]

    rows = db.query(JingcaiMatch).filter(
        JingcaiMatch.business_date == target,
    ).order_by(JingcaiMatch.match_num.asc()).all()

    odds_by_match: dict[int, dict[str, JingcaiOdds]] = {}
    if rows:
        for o in db.query(JingcaiOdds).filter(
            JingcaiOdds.match_id.in_([m.match_id for m in rows]),
        ).all():
            odds_by_match.setdefault(o.match_id, {})[o.odds_type] = o

    result = []
    for m in rows:
        odds = odds_by_match.get(m.match_id, {})
        spf_row = odds.get("SPF")
        if not spf_row or (spf_row.home is None and spf_row.draw is None and spf_row.away is None):
            continue
        rqspf_row = odds.get("RQSPF")

        def _opts(o: JingcaiOdds | None) -> list[BetOptionOut]:
            if not o or not o.options:
                return []
            try:
                return [BetOptionOut(**it) for it in json.loads(o.options)]
            except (TypeError, ValueError):
                return []

        result.append(BettingMatchOut(
            match_id=m.match_id,
            home_team=m.home_team,
            away_team=m.away_team,
            match_time=m.kickoff_time or datetime.combine(m.match_date or m.business_date, datetime.min.time()),
            league=m.league or "未知",
            league_id=m.sporttery_league_id or 0,
            status=m.status,
            home_team_id=m.sporttery_home_id or 0,
            away_team_id=m.sporttery_away_id or 0,
            home_score=m.home_score,
            away_score=m.away_score,
            betting_code=m.match_num or f"{weekday}{str(len(result) + 1).zfill(3)}",
            spf={"home": spf_row.home, "draw": spf_row.draw, "away": spf_row.away},
            rqspf={
                "handicap": rqspf_row.handicap if rqspf_row else None,
                "home": rqspf_row.home if rqspf_row else None,
                "draw": rqspf_row.draw if rqspf_row else None,
                "away": rqspf_row.away if rqspf_row else None,
            },
            bf=_opts(odds.get("CRS")),
            zjq=_opts(odds.get("TTG")),
            bqc=_opts(odds.get("HAFU")),
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


# ── Jingcai detail helpers ─────────────────────────────────────────
def _jc_match_out(m: JingcaiMatch) -> MatchOut:
    return MatchOut(
        id=m.match_id,
        home_team=m.home_team,
        away_team=m.away_team,
        home_score=m.home_score,
        away_score=m.away_score,
        half_score=None,
        match_time=m.kickoff_time or datetime.combine(m.match_date or m.business_date, datetime.min.time()),
        status=m.status,
        league=m.league or "未知",
        league_id=m.sporttery_league_id or 0,
        home_team_id=m.sporttery_home_id or 0,
        away_team_id=m.sporttery_away_id or 0,
    )


def _jc_team_name(db: Session, uniform_id: int | None) -> str:
    if not uniform_id:
        return "未知"
    t = db.query(JingcaiTeam).filter(JingcaiTeam.uniform_id == uniform_id).first()
    return t.name if t else str(uniform_id)


def _jc_standings(db: Session, match_id: int) -> MatchStandingsOut:
    rows = db.query(JingcaiStanding).filter(JingcaiStanding.match_id == match_id).all()
    home, away = [], []
    for r in rows:
        snap = StandingSnapshotOut(
            view=r.view,
            team_name=r.team_name or "",
            position=r.ranking,
            points=r.points,
            played=r.played,
            wins=r.wins,
            draws=r.draws,
            losses=r.losses,
            goals_for=r.goals_for,
            goals_against=r.goals_against,
            goal_diff=r.goal_diff,
        )
        if r.team_type == "home":
            home.append(snap)
        elif r.team_type == "away":
            away.append(snap)
    return MatchStandingsOut(home=home, away=away)


def _stat_from_results(results: list[JingcaiRecentResult], team_uid: int, recent_only: bool = False) -> dict:
    wins = draws = losses = gf = ga = 0
    for r in results:
        is_home = r.home_score is not None and r.result == "win" and r.home_score > (r.away_score or 0)
        is_away = r.away_score is not None and r.result == "win" and r.away_score > (r.home_score or 0)
        if r.result == "win":
            wins += 1
            gf += max(r.home_score or 0, r.away_score or 0)
            ga += min(r.home_score or 0, r.away_score or 0)
        elif r.result == "loss":
            losses += 1
            gf += min(r.home_score or 0, r.away_score or 0)
            ga += max(r.home_score or 0, r.away_score or 0)
        elif r.result == "draw":
            draws += 1
            gf += r.home_score or 0
            ga += r.home_score or 0
    played = wins + draws + losses
    return {
        "played": played,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "goals_for": gf,
        "goals_against": ga,
        "goal_diff": gf - ga,
        "points": wins * 3 + draws,
        "win_rate": round(wins / max(played, 1) * 100, 1),
    }


def _jc_comparison(db: Session, match_id: int, m: JingcaiMatch) -> MatchComparisonOut:
    home_uid = m.uniform_home_id
    away_uid = m.uniform_away_id
    standings = _jc_standings(db, match_id)
    home_rank = next((s.position for s in standings.home if s.view == "total"), None)
    away_rank = next((s.position for s in standings.away if s.view == "total"), None)

    def build(uid: int | None, rank: int | None):
        team_name = _jc_team_name(db, uid)
        results = []
        if uid is not None:
            results = db.query(JingcaiRecentResult).filter(
                JingcaiRecentResult.team_uniform_id == uid,
            ).order_by(JingcaiRecentResult.match_date.desc()).limit(20).all()
        recent6 = results[:6]
        total = _stat_from_results(results, uid)
        recent = _stat_from_results(recent6, uid)
        league_label = f"[{m.league or ''}-{rank}]" if rank else (f"[{m.league or ''}]" if m.league else "")
        return {
            "league_label": league_label,
            "team_name": team_name,
            "fulltime": {
                "total": total, "home": total, "away": total, "recent6": recent,
            },
            "halftime": {
                "total": total, "home": total, "away": total, "recent6": recent,
            },
        }

    return MatchComparisonOut(
        match_id=match_id,
        home=TeamComparisonOut(**build(home_uid, home_rank)),
        away=TeamComparisonOut(**build(away_uid, away_rank)),
    )


def _jc_form(db: Session, m: JingcaiMatch) -> dict:
    def build(uid: int | None):
        if uid is None:
            return TeamFormOut(team_id=0, team_name="未知", results=[])
        results = db.query(JingcaiRecentResult).filter(
            JingcaiRecentResult.team_uniform_id == uid,
        ).order_by(JingcaiRecentResult.match_date.desc()).limit(10).all()
        out = []
        for r in results:
            result = {"win": "W", "draw": "D", "loss": "L"}.get(r.result, "D")
            home = (r.home_score or 0) > (r.away_score or 0)
            if r.result == "win":
                home = r.home_score is not None and r.home_score > (r.away_score or 0)
                score = f"{r.home_score}:{r.away_score}" if r.home_score is not None else "-:-"
            elif r.result == "loss":
                score = f"{r.home_score}:{r.away_score}" if r.home_score is not None else "-:-"
            else:
                score = f"{r.home_score}:{r.away_score}" if r.home_score is not None else "-:-"
            out.append(FormResultOut(
                match_id=r.source_match_id or r.id,
                result=result,
                home=home,
                opponent=_jc_team_name(db, r.opponent_uniform_id),
                score=score,
                match_time=datetime.combine(r.match_date or m.match_date or m.business_date, datetime.min.time()),
            ))
        return TeamFormOut(team_id=uid, team_name=_jc_team_name(db, uid), results=out)

    return {
        "home": build(m.uniform_home_id),
        "away": build(m.uniform_away_id),
    }


def _jc_h2h(db: Session, match_id: int) -> list[H2HRecordOut]:
    rows = db.query(JingcaiH2h).filter(JingcaiH2h.match_id == match_id).all()
    out = []
    for r in rows:
        out.append(H2HRecordOut(
            match_id=r.id,
            home_team=_jc_team_name(db, r.home_team_id),
            away_team=_jc_team_name(db, r.away_team_id),
            home_score=r.home_score,
            away_score=r.away_score,
            match_time=datetime.combine(r.match_date or datetime.now().date(), datetime.min.time()),
            league="历史交锋",
        ))
    return out


def _jc_injuries(db: Session, match_id: int) -> MatchInjuriesOut:
    rows = db.query(JingcaiInjury).filter(JingcaiInjury.match_id == match_id).all()
    home, away = [], []
    for r in rows:
        tag = None
        if r.suspension_flag:
            tag = "停赛"
        elif r.injury_flag:
            tag = "伤病"
        p = InjuryPlayerOut(name=r.person_name or "未知", position=r.position_desc or "", tag=tag)
        if r.team_type == "home":
            home.append(p)
        elif r.team_type == "away":
            away.append(p)
    return MatchInjuriesOut(match_id=match_id, home=home, away=away)


def _jc_odds(db: Session, match_id: int) -> dict:
    odds_rows = db.query(JingcaiOdds).filter(JingcaiOdds.match_id == match_id).all()
    by_type = {o.odds_type: o for o in odds_rows}

    def _current(odds_type: str):
        latest = by_type.get(odds_type)
        if not latest:
            return None
        model = {"SPF": JingcaiOddsSpf, "RQSPF": JingcaiOddsRqspf}.get(odds_type)
        initial = None
        if model:
            initial = db.query(model).filter(model.match_id == match_id).order_by(model.snapshot_at.asc()).first()
        return {
            "odds_type": odds_type,
            "initial_home": getattr(initial, "home", None),
            "initial_draw": getattr(initial, "draw", None),
            "initial_away": getattr(initial, "away", None),
            "current_home": latest.home,
            "current_draw": latest.draw,
            "current_away": latest.away,
            "update_time": latest.snapshot_at,
        }

    def _history(model, odds_type: str, has_handicap: bool = False):
        records = db.query(model).filter(model.match_id == match_id).order_by(model.snapshot_at.asc()).all()
        out = []
        for r in records:
            opts = None
            options_attr = getattr(r, "options", None)
            if options_attr:
                try:
                    parsed = json.loads(options_attr)
                    if isinstance(parsed, list):
                        opts = {it["label"]: it.get("odds") for it in parsed if isinstance(it, dict) and "label" in it}
                    elif isinstance(parsed, dict):
                        opts = parsed
                except Exception:
                    opts = None
            out.append(OddsHistoryPointOut(
                time=r.snapshot_at,
                home=getattr(r, "home", None),
                draw=getattr(r, "draw", None),
                away=getattr(r, "away", None),
                handicap=getattr(r, "handicap", None) if has_handicap else None,
                options=opts,
            ))
        return out

    current = []
    for t in ("SPF", "RQSPF"):
        c = _current(t)
        if c:
            current.append(OddsItemOut(
                id=len(current) + 1,
                match_id=match_id,
                bookmaker="竞彩",
                odds_type=c["odds_type"],
                initial_home=c["initial_home"],
                initial_draw=c["initial_draw"],
                initial_away=c["initial_away"],
                current_home=c["current_home"],
                current_draw=c["current_draw"],
                current_away=c["current_away"],
                update_time=c["update_time"] or datetime.now(),
            ))

    return {
        "current": current,
        "history": {
            "SPF": _history(JingcaiOddsSpf, "SPF"),
            "RQSPF": _history(JingcaiOddsRqspf, "RQSPF", has_handicap=True),
            "BF": _history(JingcaiOddsCrs, "BF"),
            "ZJQ": _history(JingcaiOddsTtg, "ZJQ"),
            "BQC": _history(JingcaiOddsHafu, "BQC"),
        },
    }


@router.get("/matches/{match_id}", response_model=MatchDetailOut)
def get_match(match_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    jm = db.query(JingcaiMatch).filter(JingcaiMatch.match_id == match_id).first()
    if jm:
        return MatchDetailOut(
            match=_jc_match_out(jm),
            standings=_jc_standings(db, match_id),
            comparison=_jc_comparison(db, match_id, jm),
            form=_jc_form(db, jm),
            h2h=_jc_h2h(db, match_id),
            injuries=_jc_injuries(db, match_id),
            odds=_jc_odds(db, match_id),
            prediction=None,
            briefing=None,
            sentiment=None,
        )

    m = db.query(Match).filter(Match.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    half = f"{m.half_home_score}:{m.half_away_score}" if m.half_home_score is not None else None
    return MatchDetailOut(
        match=MatchOut(
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
        ),
        standings=MatchStandingsOut(home=[], away=[]),
        comparison=MatchComparisonOut(
            match_id=match_id,
            home=TeamComparisonOut(league_label="", team_name="", fulltime={}, halftime={}),
            away=TeamComparisonOut(league_label="", team_name="", fulltime={}, halftime={}),
        ),
        form={"home": TeamFormOut(team_id=0, team_name="", results=[]), "away": TeamFormOut(team_id=0, team_name="", results=[])},
        h2h=[],
        injuries=MatchInjuriesOut(match_id=match_id, home=[], away=[]),
        odds={"current": [], "history": {"SPF": [], "RQSPF": [], "BF": [], "ZJQ": [], "BQC": []}},
        prediction=None,
        briefing=None,
        sentiment=None,
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
