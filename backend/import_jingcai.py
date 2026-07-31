"""Import real 竞彩 (sporttery) data into the jingcai_* tables.

CLI:      python import_jingcai.py [--phase A|B|AB] [--max-files N] [--dir DIR]
Reusable: from import_jingcai import update_jingcai   (shared with future scraper tasks)

Phase A:  daily/<businessDate>.json   -> matches / teams / leagues / odds(latest) + spf/rqspf history
Phase B:  matches/<matchId>.json      -> enrich matches + full odds history + pools + detail tables
Idempotent & incremental (upsert by natural keys).
"""
import argparse
import json
import logging
import os
import re
from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.database import Base, SessionLocal, engine
from app.models.jingcai import (
    JingcaiMatch,
    JingcaiTeam,
    JingcaiLeague,
    JingcaiOdds,
    JingcaiOddsSpf,
    JingcaiOddsRqspf,
    JingcaiOddsCrs,
    JingcaiOddsTtg,
    JingcaiOddsHafu,
    JingcaiPool,
    JingcaiStanding,
    JingcaiH2h,
    JingcaiRecentResult,
    JingcaiFixture,
    JingcaiInjury,
    JingcaiPlayer,
    JingcaiSeasonFeature,
)

log = logging.getLogger("import_jingcai")

DEFAULT_DATA_DIR = r"D:\data\VSCode_file\vscode_file\spottery\scrapers\data\jingcai"

STATUS_MAP = {"Payout": "FINISHED", "Refund": "FINISHED", "OddsIn": "SCHEDULED"}

CRS_LABELS = {"s-1sh": "胜其他", "s-1sd": "平其他", "s-1sa": "负其他"}
_CRS_RE = re.compile(r"^s(\d+)s(\d+)$")

TTG_LABELS = {f"s{i}": f"{i}球" for i in range(7)}
TTG_LABELS["s7"] = "7+球"

HAFU_LABELS = {
    "hh": "胜-胜", "hd": "胜-平", "ha": "胜-负",
    "dh": "平-胜", "dd": "平-平", "da": "平-负",
    "ah": "负-胜", "ad": "负-平", "aa": "负-负",
}

_EXCLUDE_KEYS = ("updateDate", "updateTime", "goalLine")


# ---------- value helpers ----------
def _f(x):
    if x is None or x == "":
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _int(x):
    if x is None or x == "":
        return None
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def _to_date(s):
    if not s:
        return None
    try:
        return date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


def _to_dt(s):
    if not s:
        return None
    s = str(s).replace("T", " ").strip()
    if s.endswith("Z"):
        s = s[:-1]
    s = s.split(".")[0]
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _snapshot(update_date, update_time):
    return _to_dt(f"{update_date} {update_time}" if update_time else update_date)


def _parse_score(s):
    if not s:
        return None, None
    try:
        h, a = str(s).split(":")
        return int(h), int(a)
    except (ValueError, TypeError):
        return None, None


def _result(hs, as_, is_home):
    if hs is None or as_ is None:
        return None
    if is_home:
        return "win" if hs > as_ else "loss" if hs < as_ else "draw"
    return "win" if as_ > hs else "loss" if as_ < hs else "draw"


def _crs_label(key):
    if key in CRS_LABELS:
        return CRS_LABELS[key]
    m = _CRS_RE.match(key)
    if m:
        return f"{int(m.group(1))}:{int(m.group(2))}"
    return key


def _opts_to_list(options, label_map=None):
    """options: {key: '1.85', '0', ...; key+'f': flag}. -> [{label, odds}] dropping '0'/flag '-1'."""
    def label_of(k):
        if callable(label_map):
            return label_map(k)
        if isinstance(label_map, dict):
            return label_map.get(k, k)
        return _crs_label(k)

    out = []
    for k, v in options.items():
        if k.endswith("f") or k in _EXCLUDE_KEYS:
            continue
        if options.get(k + "f") == "-1" or v == "0":
            continue
        val = _f(v)
        if val is None or val <= 0:
            continue
        out.append({"label": label_of(k), "odds": val})
    return out


# ---------- dict helpers (teams / leagues) ----------
def _add_team(teams, name, sporttery_id, short=None, uniform=None):
    if not name and sporttery_id is None:
        return
    key = sporttery_id if sporttery_id is not None else f"name:{name}"
    t = teams.setdefault(key, {"name": name, "short_name": short or name,
                               "sporttery_id": sporttery_id, "uniform_id": uniform})
    if short:
        t["short_name"] = short
    if sporttery_id is not None:
        t["sporttery_id"] = sporttery_id
    if uniform:
        t["uniform_id"] = uniform
    if name and not t["name"]:
        t["name"] = name
    return t


def _add_league(leagues, name, sporttery_id, short=None, uniform=None, season_id=None, season_name=None):
    if not name and sporttery_id is None:
        return
    key = sporttery_id if sporttery_id is not None else f"name:{name}"
    l_ = leagues.setdefault(key, {"name": name, "short_name": short or name,
                                  "sporttery_id": sporttery_id, "uniform_id": uniform,
                                  "season_id": season_id, "season_name": season_name})
    if short:
        l_["short_name"] = short
    if sporttery_id is not None:
        l_["sporttery_id"] = sporttery_id
    if uniform:
        l_["uniform_id"] = uniform
    if season_id is not None:
        l_["season_id"] = season_id
    if season_name:
        l_["season_name"] = season_name
    if name and not l_["name"]:
        l_["name"] = name
    return l_


def _flush_dict_tables(db, teams, leagues):
    db.query(JingcaiTeam).delete()
    db.add_all([JingcaiTeam(**v) for v in teams.values()])
    db.query(JingcaiLeague).delete()
    db.add_all([JingcaiLeague(**v) for v in leagues.values()])
    db.flush()


# ---------- bulk upsert ----------
def _upsert(db, model, rows, index_elements, chunk=500):
    if not rows:
        return
    ins = sqlite_insert(model)
    excluded = ins.excluded
    set_cols = {c.name: excluded[c.name]
                for c in model.__table__.columns
                if c.name not in index_elements and c.name != "id"}
    stmt = ins.on_conflict_do_update(index_elements=index_elements, set_=set_cols)
    for i in range(0, len(rows), chunk):
        db.execute(stmt, rows[i:i + chunk])


# ---------- phase A: daily ----------
def _phase_a(db, daily_dir, max_files=0):
    files = sorted(glob_join(daily_dir, "*.json"))
    if max_files:
        files = files[:max_files]
    teams, leagues = {}, {}
    match_rows, odds_rows, spf_rows, rqspf_rows = [], [], [], []

    for idx, f in enumerate(files):
        try:
            with open(f, encoding="utf-8") as fh:
                d = json.load(fh)
        except (json.JSONDecodeError, OSError) as e:
            log.warning("skip unreadable %s: %s", f, e)
            continue
        scraped_dt = _to_dt(d.get("scrapedAt"))
        bd = _to_date(d.get("businessDate"))
        for m in d.get("matches") or []:
            mid = m.get("matchId")
            ht, at, lg = m.get("homeTeam"), m.get("awayTeam"), m.get("league")
            ht_id, at_id, lg_id = m.get("homeTeamId"), m.get("awayTeamId"), m.get("leagueId")
            _add_team(teams, ht, ht_id)
            _add_team(teams, at, at_id)
            _add_league(leagues, lg, lg_id)
            hs, as_ = _parse_score(m.get("matchResult"))
            match_rows.append({
                "match_id": mid,
                "business_date": bd or _to_date(m.get("businessDate")),
                "match_date": _to_date(m.get("matchDate")),
                "match_num": m.get("matchNum"),
                "home_team": ht,
                "away_team": at,
                "league": lg,
                "sporttery_home_id": ht_id,
                "sporttery_away_id": at_id,
                "sporttery_league_id": lg_id,
                "home_score": hs,
                "away_score": as_,
                "status": STATUS_MAP.get(m.get("poolStatus"), "FINISHED"),
                "pool_status": m.get("poolStatus"),
                "scraped_at": scraped_dt,
            })
            had = (m.get("had") or {}).get("odds") or {}
            spf = {"match_id": mid, "snapshot_at": scraped_dt,
                   "home": _f(had.get("home")), "draw": _f(had.get("draw")), "away": _f(had.get("away"))}
            if spf["home"] is not None or spf["draw"] is not None or spf["away"] is not None:
                odds_rows.append({"match_id": mid, "odds_type": "SPF", "snapshot_at": scraped_dt,
                                  "home": spf["home"], "draw": spf["draw"], "away": spf["away"]})
                spf_rows.append(spf)
            hc = m.get("handicap") or {}
            hodds = hc.get("odds") or {}
            rq = {"match_id": mid, "snapshot_at": scraped_dt, "handicap": hc.get("goalLine"),
                  "home": _f(hodds.get("home")), "draw": _f(hodds.get("draw")), "away": _f(hodds.get("away"))}
            if rq["home"] is not None or rq["draw"] is not None or rq["away"] is not None:
                odds_rows.append({"match_id": mid, "odds_type": "RQSPF", "snapshot_at": scraped_dt,
                                  "home": rq["home"], "draw": rq["draw"], "away": rq["away"],
                                  "handicap": rq["handicap"]})
                rqspf_rows.append(rq)
        if (idx + 1) % 500 == 0:
            log.info("A: %d/%d files", idx + 1, len(files))

    _flush_dict_tables(db, teams, leagues)
    _upsert(db, JingcaiMatch, match_rows, ("match_id",))
    _upsert(db, JingcaiOdds, odds_rows, ("match_id", "odds_type"))
    _upsert(db, JingcaiOddsSpf, spf_rows, ("match_id", "snapshot_at"))
    _upsert(db, JingcaiOddsRqspf, rqspf_rows, ("match_id", "snapshot_at"))
    db.commit()
    log.info("A done: matches=%d odds=%d spf=%d rqspf=%d",
             len(match_rows), len(odds_rows), len(spf_rows), len(rqspf_rows))
    return {"A_matches": len(match_rows), "A_odds": len(odds_rows),
            "A_spf": len(spf_rows), "A_rqspf": len(rqspf_rows)}


def glob_join(*parts):
    import glob
    return glob.glob(os.path.join(*parts))


# ---------- phase B: matches ----------
def _merge_team(teams, name, sporttery_id=None, uniform_id=None):
    """Merge a team into the dict, keyed by sporttery_id (or name fallback),
    reconciling with any phase-A name-keyed entries that lack sporttery_id."""
    if not name and sporttery_id is None:
        return
    sid_key = f"s:{sporttery_id}" if sporttery_id is not None else None
    name_key = f"n:{name}" if name else None
    t = teams.get(sid_key)
    if t is None and name_key:
        t = teams.get(name_key)
        if t is not None and sporttery_id is not None:
            t["sporttery_id"] = sporttery_id
            teams.pop(name_key, None)
            teams[sid_key] = t
    if t is None:
        t = {"name": name, "short_name": name, "sporttery_id": sporttery_id,
             "uniform_id": uniform_id}
        teams[sid_key or name_key] = t
    if name and not t["name"]:
        t["name"] = name
    if name and not t["short_name"]:
        t["short_name"] = name
    if sporttery_id is not None:
        t["sporttery_id"] = sporttery_id
    if uniform_id is not None:
        t["uniform_id"] = uniform_id
    return t


def _merge_league(leagues, name, sporttery_id=None, uniform_id=None,
                  season_id=None, season_name=None):
    if not name and sporttery_id is None:
        return
    sid_key = f"s:{sporttery_id}" if sporttery_id is not None else None
    name_key = f"n:{name}" if name else None
    l_ = leagues.get(sid_key)
    if l_ is None and name_key:
        l_ = leagues.get(name_key)
        if l_ is not None and sporttery_id is not None:
            l_["sporttery_id"] = sporttery_id
            leagues.pop(name_key, None)
            leagues[sid_key] = l_
    if l_ is None:
        l_ = {"name": name, "short_name": name, "sporttery_id": sporttery_id,
              "uniform_id": uniform_id, "season_id": season_id, "season_name": season_name}
        leagues[sid_key or name_key] = l_
    if name and not l_["name"]:
        l_["name"] = name
    if name and not l_["short_name"]:
        l_["short_name"] = name
    if sporttery_id is not None:
        l_["sporttery_id"] = sporttery_id
    if uniform_id is not None:
        l_["uniform_id"] = uniform_id
    if season_id is not None:
        l_["season_id"] = season_id
    if season_name:
        l_["season_name"] = season_name
    return l_


def _phase_b(db, matches_dir, max_files=0):
    files = sorted(glob_join(matches_dir, "*.json"))
    if max_files:
        files = files[:max_files]

    # preserve teams/leagues already in the DB from phase A
    teams = {}
    for t in db.query(JingcaiTeam).all():
        k = f"s:{t.sporttery_id}" if t.sporttery_id is not None else f"n:{t.name}"
        teams[k] = {"name": t.name, "short_name": t.short_name,
                    "sporttery_id": t.sporttery_id, "uniform_id": t.uniform_id}
    leagues = {}
    for l_ in db.query(JingcaiLeague).all():
        k = f"s:{l_.sporttery_id}" if l_.sporttery_id is not None else f"n:{l_.name}"
        leagues[k] = {"name": l_.name, "short_name": l_.short_name,
                      "sporttery_id": l_.sporttery_id, "uniform_id": l_.uniform_id,
                      "season_id": l_.season_id, "season_name": l_.season_name}

    existing = {m.match_id: m for m in db.query(JingcaiMatch).all()}

    match_rows = []
    odds_rows = []
    spf_rows, rqspf_rows, crs_rows, ttg_rows, hafu_rows = [], [], [], [], []
    pool_rows, standing_rows, h2h_rows = [], [], []
    recent_rows, fixture_rows, injury_rows, player_rows, season_rows = [], [], [], [], []
    totals = {"odds": 0, "spf": 0, "rqspf": 0, "crs": 0, "ttg": 0, "hafu": 0,
              "pools": 0, "standings": 0, "h2h": 0, "recent": 0, "fixtures": 0,
              "injuries": 0, "players": 0, "season": 0}

    def flush():
        _upsert(db, JingcaiMatch, match_rows, ("match_id",))
        _upsert(db, JingcaiOdds, odds_rows, ("match_id", "odds_type"))
        _upsert(db, JingcaiOddsSpf, spf_rows, ("match_id", "snapshot_at"))
        _upsert(db, JingcaiOddsRqspf, rqspf_rows, ("match_id", "snapshot_at"))
        _upsert(db, JingcaiOddsCrs, crs_rows, ("match_id", "snapshot_at"))
        _upsert(db, JingcaiOddsTtg, ttg_rows, ("match_id", "snapshot_at"))
        _upsert(db, JingcaiOddsHafu, hafu_rows, ("match_id", "snapshot_at"))
        _upsert(db, JingcaiPool, pool_rows, ("match_id", "code"))
        _upsert(db, JingcaiStanding, standing_rows, ("match_id", "team_type", "view"))
        _upsert(db, JingcaiH2h, h2h_rows, ("match_id", "match_date", "home_team_id", "away_team_id"))
        _upsert(db, JingcaiRecentResult, recent_rows,
                ("team_uniform_id", "match_date", "source_match_id"))
        _upsert(db, JingcaiFixture, fixture_rows,
                ("team_uniform_id", "match_date", "source_match_id"))
        _upsert(db, JingcaiInjury, injury_rows, ("match_id", "team_type", "person_id"))
        _upsert(db, JingcaiPlayer, player_rows, ("match_id", "team_type", "person_id"))
        _upsert(db, JingcaiSeasonFeature, season_rows, ("match_id",))
        db.flush()
        for name, lst in (("odds", odds_rows), ("spf", spf_rows), ("rqspf", rqspf_rows),
                          ("crs", crs_rows), ("ttg", ttg_rows), ("hafu", hafu_rows),
                          ("pools", pool_rows), ("standings", standing_rows),
                          ("h2h", h2h_rows), ("recent", recent_rows),
                          ("fixtures", fixture_rows), ("injuries", injury_rows),
                          ("players", player_rows), ("season", season_rows)):
            totals[name] += len(lst)
            lst.clear()
        match_rows.clear()

    for idx, f in enumerate(files):
        mid = int(os.path.splitext(os.path.basename(f))[0])
        try:
            with open(f, encoding="utf-8") as fh:
                d = json.load(fh)
        except (json.JSONDecodeError, OSError, ValueError) as e:
            log.warning("skip unreadable %s: %s", f, e)
            continue

        mi = d.get("matchInfo") or {}
        scraped_dt = _to_dt(d.get("scrapedAt"))
        kickoff = _to_dt(mi.get("matchDateTime"))
        match_date = kickoff.date() if kickoff else None

        live = (d.get("oddsHistory") or {}).get("oddsHistory") or {}
        home_name = mi.get("homeTeamShortName") or mi.get("homeTeamAllName") \
            or live.get("homeTeamAllName") or live.get("homeTeamAbbName")
        away_name = mi.get("awayTeamShortName") or mi.get("awayTeamAllName") \
            or live.get("awayTeamAllName") or live.get("awayTeamAbbName")
        league_name = mi.get("tournamentCnName") or mi.get("tournamentCnShortName") \
            or live.get("leagueAllName") or live.get("leagueAbbName")
        shid, said = mi.get("sportteryHomeTeamId"), mi.get("sportteryAwayTeamId")
        uhid, uaid = mi.get("uniformHomeTeamId"), mi.get("uniformAwayTeamId")
        slid, ulid = mi.get("sportteryTournamentId"), mi.get("uniformLeagueId")
        if slid is None:
            slid = _int(live.get("leagueId"))
        _merge_team(teams, home_name, shid, uhid)
        _merge_team(teams, away_name, said, uaid)
        _merge_league(leagues, league_name, slid, ulid,
                      season_id=mi.get("seasonId"), season_name=mi.get("seasonName"))

        # --- match row (preserve business_date / status from phase A) ---
        prev = existing.get(mid)
        hs, as_ = _parse_score(mi.get("fullCourtGoal") or live.get("sectionsNo999"))
        match_rows.append({
            "match_id": mid,
            "business_date": (prev.business_date if prev else match_date),
            "match_date": match_date or (prev.match_date if prev else None),
            "kickoff_time": kickoff,
            "match_num": mi.get("matchNum") or (prev.match_num if prev else None),
            "home_team": home_name or (prev.home_team if prev else None),
            "away_team": away_name or (prev.away_team if prev else None),
            "league": league_name or (prev.league if prev else None),
            "sporttery_home_id": shid or (prev.sporttery_home_id if prev else None),
            "sporttery_away_id": said or (prev.sporttery_away_id if prev else None),
            "uniform_home_id": uhid or (prev.uniform_home_id if prev else None),
            "uniform_away_id": uaid or (prev.uniform_away_id if prev else None),
            "sporttery_league_id": slid or (prev.sporttery_league_id if prev else None),
            "uniform_league_id": ulid or (prev.uniform_league_id if prev else None),
            "tournament_id": mi.get("tournamentId") or (prev.tournament_id if prev else None),
            "season_id": mi.get("seasonId") or (prev.season_id if prev else None),
            "season_name": mi.get("seasonName") or (prev.season_name if prev else None),
            "phase_name": mi.get("phaseName") or (prev.phase_name if prev else None),
            "home_score": hs,
            "away_score": as_,
            "status": (prev.status if prev else "FINISHED"),
            "pool_status": (prev.pool_status if prev else None),
            "scraped_at": scraped_dt,
        })

        # --- odds history (live snapshots) ---
        had = live.get("hadList") or []
        hhad = live.get("hhadList") or []
        crs_l = live.get("crsList") or []
        ttg_l = live.get("ttgList") or []
        hafu_l = live.get("hafuList") or []

        for item in had:
            st = _snapshot(item.get("updateDate"), item.get("updateTime"))
            if st is None:
                continue
            row = {"match_id": mid, "snapshot_at": st,
                   "update_date": item.get("updateDate"), "update_time": item.get("updateTime"),
                   "home": _f(item.get("h")), "draw": _f(item.get("d")),
                   "away": _f(item.get("a"))}
            spf_rows.append(row)
            odds_rows.append({"match_id": mid, "odds_type": "SPF", "snapshot_at": st,
                              "home": row["home"], "draw": row["draw"], "away": row["away"]})
        for item in hhad:
            st = _snapshot(item.get("updateDate"), item.get("updateTime"))
            if st is None:
                continue
            row = {"match_id": mid, "snapshot_at": st,
                   "update_date": item.get("updateDate"), "update_time": item.get("updateTime"),
                   "home": _f(item.get("h")), "draw": _f(item.get("d")),
                   "away": _f(item.get("a")), "handicap": item.get("goalLine")}
            rqspf_rows.append(row)
            odds_rows.append({"match_id": mid, "odds_type": "RQSPF", "snapshot_at": st,
                              "home": row["home"], "draw": row["draw"], "away": row["away"],
                              "handicap": row["handicap"]})
        for item in crs_l:
            st = _snapshot(item.get("updateDate"), item.get("updateTime"))
            if st is None:
                continue
            opts = json.dumps(_opts_to_list(item), ensure_ascii=False)
            crs_rows.append({"match_id": mid, "snapshot_at": st, "options": opts})
            odds_rows.append({"match_id": mid, "odds_type": "CRS",
                              "snapshot_at": st, "options": opts})
        for item in ttg_l:
            st = _snapshot(item.get("updateDate"), item.get("updateTime"))
            if st is None:
                continue
            opts = json.dumps(_opts_to_list(item, TTG_LABELS), ensure_ascii=False)
            ttg_rows.append({"match_id": mid, "snapshot_at": st, "options": opts})
            odds_rows.append({"match_id": mid, "odds_type": "TTG",
                              "snapshot_at": st, "options": opts})
        for item in hafu_l:
            st = _snapshot(item.get("updateDate"), item.get("updateTime"))
            if st is None:
                continue
            opts = json.dumps(_opts_to_list(item, HAFU_LABELS), ensure_ascii=False)
            hafu_rows.append({"match_id": mid, "snapshot_at": st, "options": opts})
            odds_rows.append({"match_id": mid, "odds_type": "HAFU",
                              "snapshot_at": st, "options": opts})

        # --- pools (final settled odds) ---
        for m in (d.get("oddsHistory") or {}).get("matchResultList") or []:
            pool_rows.append({
                "match_id": mid, "code": m.get("code"),
                "combination": m.get("combination"),
                "combination_desc": m.get("combinationDesc"),
                "odds": _f(m.get("odds")),
                "goal_line": m.get("goalLine"),
                "pool_id": _int(m.get("poolId")),
                "pool_totals": m.get("poolTotals"),
                "refund_status": m.get("refundStatus"),
            })

        # --- standings ---
        st_sec = d.get("standings") or {}
        for team_type, tables in (("home", st_sec.get("homeTables")),
                                  ("away", st_sec.get("awayTables"))):
            if not isinstance(tables, dict):
                continue
            for view, v in tables.items():
                if not isinstance(v, dict):
                    continue
                standing_rows.append({
                    "match_id": mid, "team_type": team_type, "view": view,
                    "team_name": v.get("teamShortName"),
                    "ranking": _int(v.get("ranking")),
                    "points": _int(v.get("points")),
                    "played": _int(v.get("totalLegCnt")),
                    "wins": _int(v.get("winGoalMatchCnt")),
                    "draws": _int(v.get("drawMatchCnt")),
                    "losses": _int(v.get("lossGoalMatchCnt")),
                    "goals_for": _int(v.get("goalCnt")),
                    "goals_against": _int(v.get("lossGoalCnt")),
                    "goal_diff": _int(v.get("netGoal")),
                    "win_probability": v.get("winProbability"),
                    "phase_name": v.get("phaseName"),
                })

        # --- h2h ---
        for item in (d.get("headToHead") or {}).get("matchList") or []:
            hh, ha = _parse_score(item.get("fullCourtGoal"))
            hhh, hha = _parse_score(item.get("halfTimeGoal"))
            h2h_rows.append({
                "match_id": mid, "match_date": _to_date(item.get("matchDate")),
                "home_team_id": _int(item.get("uniformHomeTeamId")) or _int(item.get("homeTeamId")),
                "away_team_id": _int(item.get("uniformAwayTeamId")) or _int(item.get("awayTeamId")),
                "home_score": hh, "away_score": ha,
                "half_home_score": hhh, "half_away_score": hha,
                "season_id": _int(item.get("seasonId")),
                "tournament_id": _int(item.get("tournamentId")),
                "winning_team": item.get("winningTeam"),
            })

        # --- recent results / fixtures (per side, keyed by uniform team id) ---
        for side, wrapper in ((d.get("recentResults") or {}).items()):
            if not isinstance(wrapper, dict):
                continue
            stats = wrapper.get("statistics") or {}
            tuid = wrapper.get("uniformTeamId")
            if tuid is None:
                tuid = stats.get("uniformTeamId")
            if tuid is None:
                continue
            for item in wrapper.get("matchList") or []:
                is_home = _int(item.get("uniformHomeTeamId")) == tuid
                hhs, has_ = _parse_score(item.get("fullCourtGoal"))
                half_h, half_a = _parse_score(item.get("halfTimeGoal"))
                if hhs is None or has_ is None:
                    res = None
                elif hhs == has_:
                    res = "draw"
                elif (hhs > has_) == is_home:
                    res = "win"
                else:
                    res = "loss"
                recent_rows.append({
                    "team_uniform_id": tuid,
                    "match_date": _to_date(item.get("matchDate")),
                    "opponent_uniform_id": (_int(item.get("uniformAwayTeamId"))
                                            if is_home else _int(item.get("uniformHomeTeamId"))),
                    "home_score": hhs, "away_score": has_,
                    "half_home_score": half_h, "half_away_score": half_a,
                    "result": res,
                    "season_id": _int(item.get("seasonId")),
                    "tournament_id": _int(item.get("tournamentId")),
                    "source_match_id": _int(item.get("matchId")),
                })

        for side, wrapper in ((d.get("fixtures") or {}).items()):
            if not isinstance(wrapper, dict):
                continue
            tuid = wrapper.get("uniformTeamId")
            if tuid is None:
                continue
            for item in wrapper.get("matchList") or []:
                is_home = _int(item.get("uniformHomeTeamId")) == tuid
                fixture_rows.append({
                    "team_uniform_id": tuid,
                    "match_date": _to_dt(item.get("matchDateTime")),
                    "opponent_uniform_id": (_int(item.get("uniformAwayTeamId"))
                                            if is_home else _int(item.get("uniformHomeTeamId"))),
                    "gameweek": item.get("gameweek"),
                    "season_id": _int(item.get("seasonId")),
                    "tournament_id": _int(item.get("tournamentId")),
                    "source_match_id": _int(item.get("matchId")),
                })

        # --- injuries / players (per side) ---
        for side, wrapper in ((d.get("injuries") or {}).items()):
            if not isinstance(wrapper, dict):
                continue
            for p in wrapper.get("injuriesAndSuspensionsList") or []:
                injury_rows.append({
                    "match_id": mid, "team_type": side,
                    "person_id": _int(p.get("personId")),
                    "person_name": p.get("personName"),
                    "position_code": p.get("playerPositionCode"),
                    "position_desc": p.get("playerPositionDesc"),
                    "injury_flag": _int(p.get("injuryFlag")),
                    "suspension_flag": _int(p.get("suspensionFlag")),
                    "appearance_cnt": _int(p.get("appearanceCnt")),
                    "started_cnt": _int(p.get("startedMatchCnt")),
                    "uniform_no": str(p.get("uniformNo")) if p.get("uniformNo") is not None else None,
                })
        for side, wrapper in ((d.get("players") or {}).items()):
            if not isinstance(wrapper, dict):
                continue
            for p in wrapper.get("playerList") or []:
                player_rows.append({
                    "match_id": mid, "team_type": side,
                    "person_id": _int(p.get("personId")),
                    "person_name": p.get("personName"),
                    "position_code": p.get("playerPositionCode"),
                    "position_desc": p.get("playerPositionDesc"),
                    "goal_cnt": _int(p.get("goalCnt")),
                    "assist_cnt": _int(p.get("assistCnt")),
                    "appearance_cnt": _int(p.get("appearanceCnt")),
                    "started_cnt": _int(p.get("startedMatchCnt")),
                    "injury_flag": _int(p.get("injuryFlag")),
                    "suspension_flag": _int(p.get("suspensionFlag")),
                    "uniform_no": str(p.get("uniformNo")) if p.get("uniformNo") is not None else None,
                })

        # --- season features ---
        sf = d.get("seasonFeatures") or {}
        if sf:
            last = sf.get("last") or {}
            season_rows.append({
                "match_id": mid,
                "home_team": (sf.get("homeTeamShortName") or home_name),
                "away_team": (sf.get("awayTeamShortName") or away_name),
                "goal_avg_home": _f((sf.get("goalAvg") or {}).get("homeGoalAvgCntRatio")),
                "goal_avg_away": _f((sf.get("goalAvg") or {}).get("awayGoalAvgCntRatio")),
                "loss_goal_avg_home": _f((sf.get("lossGoalAvg") or {}).get("homeLossGoalAvgCntRatio")),
                "loss_goal_avg_away": _f((sf.get("lossGoalAvg") or {}).get("awayLossGoalAvgCntRatio")),
                "recent_home_wins": _int(last.get("homeWinGoalMatchCnt")),
                "recent_home_draws": _int(last.get("homeDrawMatchCnt")),
                "recent_home_losses": _int(last.get("homeLossGoalMatchCnt")),
                "recent_away_wins": _int(last.get("awayWinGoalMatchCnt")),
                "recent_away_draws": _int(last.get("awayDrawMatchCnt")),
                "recent_away_losses": _int(last.get("awayLossGoalMatchCnt")),
                "data": json.dumps(sf, ensure_ascii=False),
            })

        if (idx + 1) % 3000 == 0:
            flush()
            db.commit()
            log.info("B: %d/%d files", idx + 1, len(files))

    _flush_dict_tables(db, teams, leagues)
    flush()
    db.commit()
    counts = {
        "B_matches": len(files),
        "B_odds": totals["odds"] or None,
        "B_spf": totals["spf"] or None,
        "B_rqspf": totals["rqspf"] or None,
        "B_crs": totals["crs"] or None,
        "B_ttg": totals["ttg"] or None,
        "B_hafu": totals["hafu"] or None,
        "B_pools": totals["pools"] or None,
        "B_standings": totals["standings"] or None,
        "B_h2h": totals["h2h"] or None,
        "B_recent": totals["recent"] or None,
        "B_fixtures": totals["fixtures"] or None,
        "B_injuries": totals["injuries"] or None,
        "B_players": totals["players"] or None,
        "B_season": totals["season"] or None,
    }
    log.info("B done: %s", {k: v for k, v in counts.items() if v is not None})
    return counts


def update_jingcai(db, data_dir=DEFAULT_DATA_DIR, phase="AB", max_files=0):
    counts = {}
    if phase in ("A", "AB"):
        counts.update(_phase_a(db, os.path.join(data_dir, "daily"),
                               max_files=max_files if phase == "A" else 0))
        db.commit()
    if phase in ("B", "AB"):
        counts.update(_phase_b(db, os.path.join(data_dir, "matches"),
                               max_files=max_files if phase == "B" else 0))
        db.commit()
    return counts


def main():
    parser = argparse.ArgumentParser(description="Import 竞彩 data into jingcai_* tables")
    parser.add_argument("--dir", default=os.environ.get("JINGCAI_DATA_DIR", DEFAULT_DATA_DIR))
    parser.add_argument("--phase", default="AB", choices=["A", "B", "AB"])
    parser.add_argument("--max-files", type=int, default=0,
                        help="limit files for a partial run (testing)")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(message)s",
    )
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("PRAGMA synchronous=OFF"))
    db = SessionLocal()
    try:
        counts = update_jingcai(db, args.dir, phase=args.phase, max_files=args.max_files)
        for k, v in counts.items():
            if v:
                log.info("  %s: %d", k, v)
    finally:
        db.close()


if __name__ == "__main__":
    main()
