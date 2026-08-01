"""In-process background import job manager for the admin UI.

Runs `update_jingcai` in a daemon thread while the FastAPI app keeps serving.
Job state lives in memory, so it is per-worker; a single uvicorn worker is assumed.
"""
import os
import threading
import uuid
from datetime import datetime, timezone

from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal, engine
from import_jingcai import update_jingcai

CONFIRM_PHRASE = "清空重建竞彩数据"
TEST_MAX_FILES = 50

MODES = ("incremental", "resync", "full_rebuild", "test")
PHASES = ("A", "B", "AB")

PHASE_A_TABLES = ("jingcai_matches", "jingcai_teams", "jingcai_leagues", "jingcai_odds")
PHASE_B_TABLES = (
    "jingcai_matches", "jingcai_teams", "jingcai_leagues", "jingcai_odds",
    "jingcai_odds_spf", "jingcai_odds_rqspf", "jingcai_odds_crs",
    "jingcai_odds_ttg", "jingcai_odds_hafu", "jingcai_pools",
    "jingcai_standings", "jingcai_h2h", "jingcai_recent_results",
    "jingcai_fixtures", "jingcai_injuries", "jingcai_players",
    "jingcai_season_features",
)
INFO_TABLES = (
    "jingcai_matches", "jingcai_odds", "jingcai_odds_spf", "jingcai_odds_rqspf",
    "jingcai_odds_crs", "jingcai_odds_ttg", "jingcai_odds_hafu",
)


class JobRunningError(Exception):
    pass


class InvalidConfirm(Exception):
    pass


def _now():
    return datetime.now(timezone.utc).isoformat()


def _tables_for_phase(phase):
    if phase == "A":
        return set(PHASE_A_TABLES)
    if phase == "B":
        return set(PHASE_B_TABLES)
    return set(PHASE_B_TABLES)


def _clear_tables(db, tables):
    for t in sorted(tables):
        db.execute(text(f'DELETE FROM "{t}"'))
    db.commit()


def _clear_fingerprints(db, data_dir, phase):
    subs = ["daily", "matches"] if phase == "AB" else ["daily"] if phase == "A" else ["matches"]
    for sub in subs:
        prefix = os.path.join(data_dir, sub)
        db.execute(text("DELETE FROM jingcai_import_files WHERE file_path LIKE :p"),
                   {"p": prefix + "%"})
    db.commit()


def _count_files(path):
    try:
        return len([f for f in os.listdir(path) if f.endswith(".json")])
    except OSError:
        return 0


def _table_rows(table):
    try:
        with engine.connect() as conn:
            return conn.execute(text(f'SELECT count(*) FROM "{table}"')).scalar() or 0
    except Exception:
        return 0


def _empty_job():
    return {
        "id": None,
        "mode": None,
        "phase": None,
        "status": "idle",
        "stage": None,
        "done": 0,
        "total": 0,
        "counts": None,
        "error": None,
        "started_at": None,
        "finished_at": None,
        "data_dir": settings.jingcai_data_dir,
    }


_job = None
_lock = threading.Lock()
_stop = threading.Event()


def start(mode, phase, confirm=None):
    global _job
    if mode not in MODES:
        raise ValueError(f"Unknown mode: {mode}")
    if mode == "test":
        phase = "B"
    elif phase not in PHASES:
        raise ValueError(f"Unknown phase: {phase}")
    if mode == "full_rebuild" and confirm != CONFIRM_PHRASE:
        raise InvalidConfirm()

    with _lock:
        if _job and _job.get("status") == "running":
            raise JobRunningError()
        _stop.clear()
        job = _empty_job()
        job.update({
            "id": uuid.uuid4().hex[:12],
            "mode": mode,
            "phase": phase,
            "status": "running",
            "stage": "scan",
            "started_at": _now(),
        })
        _job = job

    t = threading.Thread(target=_run, args=(job, mode, phase), daemon=True)
    t.start()
    return dict(_job)


def stop():
    _stop.set()
    return status()


def status():
    with _lock:
        return dict(_job) if _job else _empty_job()


def info():
    data_dir = settings.jingcai_data_dir
    with _lock:
        last = dict(_job) if _job else _empty_job()
    return {
        "data_dir": data_dir,
        "data_dir_exists": os.path.isdir(data_dir),
        "daily_files": _count_files(os.path.join(data_dir, "daily")),
        "matches_files": _count_files(os.path.join(data_dir, "matches")),
        "confirm_phrase": CONFIRM_PHRASE,
        "test_max_files": TEST_MAX_FILES,
        "tables": {t: _table_rows(t) for t in INFO_TABLES},
        "last_job": last,
    }


def _run(job, mode, phase):
    db = None
    try:
        db = SessionLocal()
        with engine.connect() as conn:
            conn.execute(text("PRAGMA synchronous=OFF"))
        data_dir = settings.jingcai_data_dir

        if mode == "full_rebuild":
            job["stage"] = "clearing"
            _clear_tables(db, _tables_for_phase(phase))
            _clear_fingerprints(db, data_dir, phase)

        def progress(stage, done, total):
            with _lock:
                job["stage"] = stage
                job["done"] = done
                job["total"] = total

        kwargs = dict(phase=phase, progress=progress,
                      should_stop=lambda: _stop.is_set())
        if mode == "incremental":
            kwargs["incremental"] = True
        if mode == "test":
            kwargs = dict(phase="B", max_files=TEST_MAX_FILES,
                          progress=progress, should_stop=lambda: _stop.is_set())

        counts = update_jingcai(db, data_dir=data_dir, **kwargs)

        with _lock:
            job["counts"] = counts
            job["status"] = "stopped" if _stop.is_set() else "done"
            job["stage"] = None if _stop.is_set() else "done"
    except Exception as e:
        with _lock:
            job["status"] = "failed"
            job["error"] = f"{type(e).__name__}: {e}"
            job["stage"] = None
    finally:
        with _lock:
            job["finished_at"] = _now()
        if db is not None:
            db.close()
