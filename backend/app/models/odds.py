from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func

from app.database import Base


class OddsHistory(Base):
    __tablename__ = "odds_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, index=True)
    bookmaker = Column(String, nullable=False)
    odds_type = Column(String, nullable=False)
    snapshot_at = Column(DateTime, nullable=False)
    home_odds = Column(Float, nullable=True)
    draw_odds = Column(Float, nullable=True)
    away_odds = Column(Float, nullable=True)
    handicap = Column(String, nullable=True)
    options = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
