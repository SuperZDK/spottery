from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func

from app.database import Base


class Briefing(Base):
    __tablename__ = "briefings"

    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), primary_key=True)
    content = Column(String, nullable=False)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
