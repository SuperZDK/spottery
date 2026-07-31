from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, UniqueConstraint

from app.database import Base


class JingcaiMatch(Base):
    __tablename__ = "jingcai_matches"

    match_id = Column(Integer, primary_key=True)
    business_date = Column(Date, nullable=False, index=True)
    match_date = Column(Date, nullable=False, index=True)
    kickoff_time = Column(DateTime, nullable=True)
    match_num = Column(String, nullable=False)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    league = Column(String, nullable=True)
    sporttery_home_id = Column(Integer, nullable=True)
    sporttery_away_id = Column(Integer, nullable=True)
    uniform_home_id = Column(Integer, nullable=True)
    uniform_away_id = Column(Integer, nullable=True)
    sporttery_league_id = Column(Integer, nullable=True)
    uniform_league_id = Column(Integer, nullable=True)
    tournament_id = Column(Integer, nullable=True)
    season_id = Column(Integer, nullable=True)
    season_name = Column(String, nullable=True)
    phase_name = Column(String, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="FINISHED", index=True)
    pool_status = Column(String, nullable=True)
    scraped_at = Column(DateTime, nullable=True)


class JingcaiTeam(Base):
    __tablename__ = "jingcai_teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    sporttery_id = Column(Integer, nullable=True, unique=True)
    uniform_id = Column(Integer, nullable=True)


class JingcaiLeague(Base):
    __tablename__ = "jingcai_leagues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    sporttery_id = Column(Integer, nullable=True, unique=True)
    uniform_id = Column(Integer, nullable=True)
    season_id = Column(Integer, nullable=True)
    season_name = Column(String, nullable=True)


class JingcaiOdds(Base):
    __tablename__ = "jingcai_odds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    odds_type = Column(String, nullable=False)
    snapshot_at = Column(DateTime, nullable=True)
    home = Column(Float, nullable=True)
    draw = Column(Float, nullable=True)
    away = Column(Float, nullable=True)
    handicap = Column(String, nullable=True)
    options = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "odds_type"),
    )


class JingcaiOddsSpf(Base):
    __tablename__ = "jingcai_odds_spf"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    snapshot_at = Column(DateTime, nullable=False)
    update_date = Column(String, nullable=True)
    update_time = Column(String, nullable=True)
    home = Column(Float, nullable=True)
    draw = Column(Float, nullable=True)
    away = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "snapshot_at"),
    )


class JingcaiOddsRqspf(Base):
    __tablename__ = "jingcai_odds_rqspf"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    snapshot_at = Column(DateTime, nullable=False)
    update_date = Column(String, nullable=True)
    update_time = Column(String, nullable=True)
    home = Column(Float, nullable=True)
    draw = Column(Float, nullable=True)
    away = Column(Float, nullable=True)
    handicap = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "snapshot_at"),
    )


class JingcaiOddsCrs(Base):
    __tablename__ = "jingcai_odds_crs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    snapshot_at = Column(DateTime, nullable=False)
    options = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "snapshot_at"),
    )


class JingcaiOddsTtg(Base):
    __tablename__ = "jingcai_odds_ttg"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    snapshot_at = Column(DateTime, nullable=False)
    options = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "snapshot_at"),
    )


class JingcaiOddsHafu(Base):
    __tablename__ = "jingcai_odds_hafu"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    snapshot_at = Column(DateTime, nullable=False)
    options = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "snapshot_at"),
    )


class JingcaiPool(Base):
    __tablename__ = "jingcai_pools"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    code = Column(String, nullable=False)
    combination = Column(String, nullable=True)
    combination_desc = Column(String, nullable=True)
    odds = Column(Float, nullable=True)
    goal_line = Column(String, nullable=True)
    pool_id = Column(Integer, nullable=True)
    pool_totals = Column(String, nullable=True)
    refund_status = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "code"),
    )


class JingcaiStanding(Base):
    __tablename__ = "jingcai_standings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    team_type = Column(String, nullable=False)
    view = Column(String, nullable=False)
    team_name = Column(String, nullable=True)
    team_id = Column(Integer, nullable=True)
    ranking = Column(Integer, nullable=True)
    points = Column(Integer, nullable=True)
    played = Column(Integer, nullable=True)
    wins = Column(Integer, nullable=True)
    draws = Column(Integer, nullable=True)
    losses = Column(Integer, nullable=True)
    goals_for = Column(Integer, nullable=True)
    goals_against = Column(Integer, nullable=True)
    goal_diff = Column(Integer, nullable=True)
    win_probability = Column(String, nullable=True)
    phase_name = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "team_type", "view"),
    )


class JingcaiH2h(Base):
    __tablename__ = "jingcai_h2h"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    match_date = Column(Date, nullable=True)
    home_team_id = Column(Integer, nullable=True)
    away_team_id = Column(Integer, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    half_home_score = Column(Integer, nullable=True)
    half_away_score = Column(Integer, nullable=True)
    season_id = Column(Integer, nullable=True)
    tournament_id = Column(Integer, nullable=True)
    winning_team = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "match_date", "home_team_id", "away_team_id"),
    )


class JingcaiRecentResult(Base):
    __tablename__ = "jingcai_recent_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_uniform_id = Column(Integer, nullable=False, index=True)
    match_date = Column(Date, nullable=True)
    opponent_uniform_id = Column(Integer, nullable=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    half_home_score = Column(Integer, nullable=True)
    half_away_score = Column(Integer, nullable=True)
    result = Column(String, nullable=True)
    season_id = Column(Integer, nullable=True)
    tournament_id = Column(Integer, nullable=True)
    source_match_id = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("team_uniform_id", "match_date", "source_match_id"),
    )


class JingcaiFixture(Base):
    __tablename__ = "jingcai_fixtures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_uniform_id = Column(Integer, nullable=False, index=True)
    match_date = Column(DateTime, nullable=True)
    opponent_uniform_id = Column(Integer, nullable=True)
    gameweek = Column(String, nullable=True)
    season_id = Column(Integer, nullable=True)
    tournament_id = Column(Integer, nullable=True)
    source_match_id = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("team_uniform_id", "match_date", "source_match_id"),
    )


class JingcaiInjury(Base):
    __tablename__ = "jingcai_injuries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    team_type = Column(String, nullable=False)
    person_id = Column(Integer, nullable=True)
    person_name = Column(String, nullable=True)
    position_code = Column(String, nullable=True)
    position_desc = Column(String, nullable=True)
    injury_flag = Column(Integer, nullable=True)
    suspension_flag = Column(Integer, nullable=True)
    appearance_cnt = Column(Integer, nullable=True)
    started_cnt = Column(Integer, nullable=True)
    uniform_no = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "team_type", "person_id"),
    )


class JingcaiPlayer(Base):
    __tablename__ = "jingcai_players"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, index=True)
    team_type = Column(String, nullable=False)
    person_id = Column(Integer, nullable=True)
    person_name = Column(String, nullable=True)
    position_code = Column(String, nullable=True)
    position_desc = Column(String, nullable=True)
    goal_cnt = Column(Integer, nullable=True)
    assist_cnt = Column(Integer, nullable=True)
    appearance_cnt = Column(Integer, nullable=True)
    started_cnt = Column(Integer, nullable=True)
    injury_flag = Column(Integer, nullable=True)
    suspension_flag = Column(Integer, nullable=True)
    uniform_no = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("match_id", "team_type", "person_id"),
    )


class JingcaiSeasonFeature(Base):
    __tablename__ = "jingcai_season_features"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, nullable=False, unique=True)
    home_team = Column(String, nullable=True)
    away_team = Column(String, nullable=True)
    goal_avg_home = Column(Float, nullable=True)
    goal_avg_away = Column(Float, nullable=True)
    loss_goal_avg_home = Column(Float, nullable=True)
    loss_goal_avg_away = Column(Float, nullable=True)
    recent_home_wins = Column(Integer, nullable=True)
    recent_home_draws = Column(Integer, nullable=True)
    recent_home_losses = Column(Integer, nullable=True)
    recent_away_wins = Column(Integer, nullable=True)
    recent_away_draws = Column(Integer, nullable=True)
    recent_away_losses = Column(Integer, nullable=True)
    data = Column(Text, nullable=True)
