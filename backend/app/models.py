import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, JSON, Text
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class UserRole(str, enum.Enum):
    FREE = "FREE"
    VIP = "VIP"
    ADMIN = "ADMIN"


class MatchStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    FINISHED = "FINISHED"
    POSTPONED = "POSTPONED"
    CANCELLED = "CANCELLED"


class OddsType(str, enum.Enum):
    SPF = "SPF"
    RQSPF = "RQSPF"
    BF = "BF"
    ZJQ = "ZJQ"
    BQC = "BQC"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.FREE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    home_team = Column(String(255), nullable=False)
    away_team = Column(String(255), nullable=False)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    half_score = Column(String(50), nullable=True)
    match_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(MatchStatus), default=MatchStatus.SCHEDULED, nullable=False)
    league = Column(String(255), nullable=False)
    league_id = Column(Integer, nullable=True)
    home_team_id = Column(Integer, nullable=True)
    away_team_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    odds = relationship("Odds", back_populates="match", cascade="all, delete-orphan")


class Odds(Base):
    __tablename__ = "odds"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    bookmaker = Column(String(255), nullable=False)
    odds_type = Column(Enum(OddsType), nullable=False)
    initial_home = Column(Float, nullable=True)
    initial_draw = Column(Float, nullable=True)
    initial_away = Column(Float, nullable=True)
    current_home = Column(Float, nullable=True)
    current_draw = Column(Float, nullable=True)
    current_away = Column(Float, nullable=True)
    update_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    match = relationship("Match", back_populates="odds")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    short_name = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)
    league_id = Column(Integer, nullable=True)
    country = Column(String(100), nullable=True)


class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=True)
    season = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)


class RawScrape(Base):
    __tablename__ = "raw_scrapes"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(255), nullable=False)
    raw_data = Column(JSON, nullable=False)
    scraped_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
