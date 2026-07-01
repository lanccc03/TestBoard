from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.test_reports import router as test_reports_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="TestBoard API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(test_reports_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "testboard-backend"}
