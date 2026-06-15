import contextlib
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.modules.catalog.presentation.router import router as catalog_router
from app.modules.placement.presentation.router import router as placement_router
from app.modules.progress.presentation.router import router as progress_router
from app.modules.speaking.presentation.dependencies import get_stt_engine
from app.modules.speaking.presentation.router import router as speaking_router


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Load STT weights before serving so the first request stays in budget.
    # Off by default (dev/CI run offline); prod sets STT_WARMUP_ON_STARTUP=true.
    if settings.stt_warmup_on_startup:
        with contextlib.suppress(Exception):
            get_stt_engine().warmup()  # type: ignore[attr-defined]
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog_router)
app.include_router(progress_router)
app.include_router(placement_router)
app.include_router(speaking_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
