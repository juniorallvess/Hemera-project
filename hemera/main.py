"""FastAPI application — Hemera."""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from hemera.routes import (
    moradores, leituras, intervencoes, consultas, ws,
    planta, simulador_ctrl, analises, geometria, avancado,
    auth,
)
from hemera.routes.ws import broadcast_sync
from hemera.intervencoes import registrar_ws_callback
from hemera.leitura_events import registrar_ws_callback as registrar_leitura_ws
from hemera.planta_layout import aplicar_migracao_layout, aplicar_migracao_geometria
from hemera import simulador_live, poll_leituras

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
SERVE_SPA = FRONTEND_DIST.is_dir() and (FRONTEND_DIST / "index.html").is_file()


@asynccontextmanager
async def lifespan(app: FastAPI):
    auth.criar_tabela_usuarios_se_nao_existe()
    aplicar_migracao_layout()
    aplicar_migracao_geometria()
    registrar_ws_callback(broadcast_sync)
    registrar_leitura_ws(broadcast_sync)
    simulador_live.registrar_ws_broadcast(broadcast_sync)
    poll_leituras.registrar_ws_broadcast(broadcast_sync)

    from hemera.motor import loop_motor
    task_motor = asyncio.create_task(loop_motor())
    task_poll = asyncio.create_task(poll_leituras.loop_poll_leituras())
    log.info("Motor Hemera iniciado.")
    yield
    await simulador_live.parar()
    from hemera import simulador_batch
    await simulador_batch.parar_batch()
    for t in (task_motor, task_poll):
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass
    log.info("Motor Hemera encerrado.")


app = FastAPI(title="Hemera", lifespan=lifespan)

# Routers
app.include_router(auth.router)
app.include_router(moradores.router)
app.include_router(leituras.router)
app.include_router(intervencoes.router)
app.include_router(consultas.router)
app.include_router(analises.router)
app.include_router(geometria.router)
app.include_router(avancado.router)
app.include_router(planta.router)
app.include_router(simulador_ctrl.router)
app.include_router(ws.router)

# Static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
if SERVE_SPA and (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
elif (STATIC_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

if SERVE_SPA and (FRONTEND_DIST / "vid").is_dir():
    app.mount("/vid", StaticFiles(directory=FRONTEND_DIST / "vid"), name="vid")


@app.get("/")
async def index():
    if SERVE_SPA:
        return FileResponse(FRONTEND_DIST / "index.html")

@app.get("/login")
async def login_page():
    if SERVE_SPA:
        return FileResponse(FRONTEND_DIST / "login.html")
    return FileResponse(STATIC_DIR / "login.html")



# SPA catch-all — MUST stay last route registered in module.
if SERVE_SPA:
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith(("api", "ws", "assets", "static")):
            raise HTTPException(status_code=404)
        return FileResponse(FRONTEND_DIST / "index.html")
