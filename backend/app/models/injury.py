from sqlalchemy import Column, Integer, String, ForeignKey, func, DateTime

from app.database import Base


class Injury(Base):
    __tablename__ = "injuries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, index=True)
    team_type = Column(String, nullable=False)
    player_name = Column(String, nullable=False)
    position = Column(String, nullable=True)
    tag = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
