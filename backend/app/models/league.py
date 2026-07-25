from sqlalchemy import Column, Integer, String

from app.database import Base


class League(Base):
    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=True)
    season = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
