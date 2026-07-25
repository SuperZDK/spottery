from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint

from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=True)
    country = Column(String, nullable=True)


class TeamAlias(Base):
    __tablename__ = "team_aliases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    source = Column(String, nullable=False)
    name = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("team_id", "source", "name"),
    )
