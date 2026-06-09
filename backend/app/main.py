import os
import asyncio
from pathlib import Path
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, Response
from app.database import engine, Base
from app.routes import auth_routes, test_routes, attempt_routes, notification_routes
from app.migrations import run_migrations, cleanup_old_tests
import httpx
import websockets as ws_lib

# Create all tables
Base.metadata.create_all(bind=engine)

# Run column migrations for existing tables
run_migrations()

# Delete tests older than 60 days
cleanup_old_tests()

app = FastAPI(title="SnapIQ API", version="1.0.0")

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


# ─── EmpTracking Reverse Proxy to Node.js on port 3000 ───
NODE_BACKEND = "http://127.0.0.1:3000"

@app.middleware("http")
async def emptracking_proxy_middleware(request: Request, call_next):
    path = request.url.path
    # Proxy all /empTracking requests to Node.js BEFORE anything else
    if path == "/empTracking" or path.startswith("/empTracking/"):
        target_url = f"{NODE_BACKEND}{path}"
        query = str(request.url.query)
        if query:
            target_url += f"?{query}"
        try:
            async with httpx.AsyncClient(follow_redirects=True) as client:
                body = await request.body()
                fwd_headers = {}
                for k, v in request.headers.items():
                    if k.lower() not in ("host", "transfer-encoding"):
                        fwd_headers[k] = v
                resp = await client.request(
                    method=request.method,
                    url=target_url,
                    headers=fwd_headers,
                    content=body,
                    timeout=30.0,
                )
                excluded = {"transfer-encoding", "content-encoding", "content-length"}
                resp_headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}
                return Response(content=resp.content, status_code=resp.status_code, headers=resp_headers)
        except Exception as e:
            return Response(content=f"Proxy error: {e}", status_code=502)
    return await call_next(request)

@app.websocket("/empTracking/socket.io/")
async def proxy_ws(websocket: WebSocket):
    await websocket.accept()
    query = str(websocket.scope.get("query_string", b""), "utf-8")
    ws_url = f"ws://127.0.0.1:3000/empTracking/socket.io/?{query}"
    try:
        async with ws_lib.connect(ws_url) as backend_ws:
            async def forward_to_backend():
                try:
                    while True:
                        data = await websocket.receive_text()
                        await backend_ws.send(data)
                except Exception:
                    pass
            async def forward_to_client():
                try:
                    async for msg in backend_ws:
                        await websocket.send_text(msg)
                except Exception:
                    pass
            await asyncio.gather(forward_to_backend(), forward_to_client())
    except Exception:
        pass


# Serve frontend static files in production
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="static-assets")

    @app.middleware("http")
    async def serve_spa(request: Request, call_next):
        response = await call_next(request)
        if response.status_code == 404 and not request.url.path.startswith("/api/") and not request.url.path.startswith("/assets/"):
            return FileResponse(str(FRONTEND_DIR / "index.html"))
        return response
