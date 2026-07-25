from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func

from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), primary_key=True)
    home_prob = Column(Integer, nullable=False)
    draw_prob = Column(Integer, nullable=False)
    away_prob = Column(Integer, nullable=False)
    confidence = Column(Integer, nullable=False)
    model_version = Column(String, nullable=False)
    predicted_result = Column(String, nullable=False)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
