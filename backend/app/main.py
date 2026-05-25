import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.database import engine, Base
from app.routes import auth_routes, test_routes, attempt_routes, notification_routes
from app.migrations import run_migrations

# Create all tables
Base.metadata.create_all(bind=engine)

# Run column migrations for existing tables
run_migrations()

app = FastAPI(title="MCQ Test Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(test_routes.router)
app.include_router(attempt_routes.router)
app.include_router(notification_routes.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# Serve frontend static files in production
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static-assets")

    @app.middleware("http")
    async def serve_spa(request: Request, call_next):
        response = await call_next(request)
        # If no API route matched and it's a page navigation (not /api/), serve index.html
        if response.status_code == 404 and not request.url.path.startswith("/api/") and not request.url.path.startswith("/assets/"):
            return FileResponse(str(FRONTEND_DIR / "index.html"))
        return response
