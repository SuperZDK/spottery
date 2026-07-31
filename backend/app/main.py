from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.database import engine, Base
from app.dependencies.rate_limit import limiter
from app.models import *  # noqa: F401, F403 — ensure all models are imported for table creation
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.teams import router as teams_router
from app.routers.matches import router as matches_router
from app.routers.internal import router as internal_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Spottery API", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(teams_router, prefix="/api/v1")
app.include_router(matches_router, prefix="/api/v1")
app.include_router(internal_router, prefix="/api/v1")


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
