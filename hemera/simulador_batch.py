"""Executa simulador CLI em subprocess com status."""
import asyncio
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)

_estado: dict = {
    "rodando": False,
    "modo": None,
    "cenario": "luto",
    "velocidade": 1440,
    "dias": 30,
    "dia_simulado": 0,
}
_proc = None
_monitor_task: asyncio.Task | None = None

ROOT = Path(__file__).parent.parent


def obter_estado() -> dict:
    return dict(_estado)


async def _monitorar() -> None:
    from hemera.database import fetchone
    while _estado["rodando"] and _proc and _proc.returncode is None:
        row = fetchone("SELECT MAX(registrado_em) AS t, COUNT(*) AS n FROM leituras")
        if row and row["t"]:
            try:
                inicio = fetchone("SELECT MIN(registrado_em) AS t FROM leituras")
                if inicio and inicio["t"]:
                    from datetime import datetime
                    t0 = datetime.fromisoformat(inicio["t"].replace(" ", "T"))
                    t1 = datetime.fromisoformat(row["t"].replace(" ", "T"))
                    dias = max(1, (t1 - t0).days + 1)
                    _estado["dia_simulado"] = min(_estado["dias"], dias)
            except Exception:
                pass
        await asyncio.sleep(2)

    _estado["rodando"] = False
    _estado["modo"] = None


async def iniciar_batch(cenario: str, dias: int, velocidade: int) -> None:
    global _proc, _monitor_task
    await parar_batch()
    _estado.update({
        "rodando": True,
        "modo": "batch",
        "cenario": cenario,
        "dias": dias,
        "velocidade": velocidade,
        "dia_simulado": 0,
    })
    cmd = [
        sys.executable, "-m", "simulador.simulador",
        "--cenario", cenario,
        "--dias", str(dias),
        "--velocidade", str(velocidade),
    ]
    _proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(ROOT),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _monitor_task = asyncio.create_task(_monitorar())
    log.info("Simulador batch PID=%s", _proc.pid)


async def parar_batch() -> None:
    global _proc, _monitor_task
    _estado["rodando"] = False
    if _proc and _proc.returncode is None:
        _proc.terminate()
        try:
            await asyncio.wait_for(_proc.wait(), timeout=5)
        except asyncio.TimeoutError:
            _proc.kill()
    _proc = None
    if _monitor_task and not _monitor_task.done():
        _monitor_task.cancel()
        try:
            await _monitor_task
        except asyncio.CancelledError:
            pass
    _monitor_task = None
    _estado["modo"] = None
