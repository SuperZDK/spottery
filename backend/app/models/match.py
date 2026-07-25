from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, func

from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=True)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    match_time = Column(DateTime, nullable=False, index=True)
    status = Column(String, nullable=False, default="SCHEDULED", index=True)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    half_home_score = Column(Integer, nullable=True)
    half_away_score = Column(Integer, nullable=True)
    round = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class MatchSourceMapping(Base):
    __tablename__ = "match_source_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    source = Column(String, nullable=False)
    source_id = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("source", "source_id"),
    )
