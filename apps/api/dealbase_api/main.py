"""DealBase FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from .config import settings
from .database import engine, create_db_and_tables
from .routers import deals, health, intake, valuation, export

app = FastAPI(
    title="DealBase API",
    description="Commercial Real Estate Valuation Engine",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(deals.router, prefix="/api", tags=["deals"])
app.include_router(intake.router, prefix="/api", tags=["intake"])
app.include_router(valuation.router, prefix="/api", tags=["valuation"])
app.include_router(export.router, prefix="/api", tags=["export"])


@app.get("/")
async def root():
    """Root endpoint with API information and links."""
    return {
        "message": "DealBase CRE Valuation Engine API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "redoc": "/api/redoc",
        "health": "/api/health",
        "endpoints": {
            "deals": "/api/deals",
            "intake": "/api/intake",
            "valuation": "/api/valuation",
            "export": "/api/export"
        }
    }


@app.get("/docs")
async def redirect_docs():
    """Redirect /docs to /api/docs for convenience."""
    return RedirectResponse(url="/api/docs")


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize database on startup."""
    create_db_and_tables()


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "dealbase_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
