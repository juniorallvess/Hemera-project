"""FastAPI application — Hemera."""
import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from hemera.routes import (
    moradores, leituras, intervencoes, consultas, ws,
    planta, simulador_ctrl,
)
from hemera.routes.ws import broadcast_sync
from hemera.intervencoes import registrar_ws_callback
from hemera.leitura_events import registrar_ws_callback as registrar_leitura_ws
from hemera.planta_layout import aplicar_migracao_layout
from hemera import simulador_live, poll_leituras

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    aplicar_migracao_layout()
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
app.include_router(moradores.router)
app.include_router(leituras.router)
app.include_router(intervencoes.router)
app.include_router(consultas.router)
app.include_router(planta.router)
app.include_router(simulador_ctrl.router)
app.include_router(ws.router)

# Static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
_assets_dir = STATIC_DIR / "assets"
if _assets_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")


@app.get("/")
async def index():
    from fastapi.responses import FileResponse
    return FileResponse(STATIC_DIR / "index.html")
