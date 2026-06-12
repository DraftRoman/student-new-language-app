from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.modules.catalog.presentation.router import router as catalog_router
from app.modules.placement.presentation.router import router as placement_router
from app.modules.progress.presentation.router import router as progress_router

app = FastAPI(title=settings.app_name, version="0.1.0")

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
