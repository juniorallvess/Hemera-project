"""Controlo da simulação (ao vivo e batch)."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from hemera import simulador_batch, simulador_live

router = APIRouter()


class SimuladorIniciar(BaseModel):
    modo: str = Field(..., pattern="^(ao_vivo|batch)$")
    cenario: str = "luto"
    dias: int = Field(30, ge=1, le=90)
    velocidade: int = Field(1440, ge=1, le=10000)


@router.get("/api/simulador/status")
def status_simulador() -> dict:
    live = simulador_live.obter_estado()
    batch = simulador_batch.obter_estado()
    if live.get("rodando"):
        return live
    if batch.get("rodando"):
        return batch
    return {
        "rodando": False,
        "modo": None,
        "cenario": "luto",
        "velocidade": 1440,
        "dia_simulado": 0,
        "dias": 30,
    }


@router.post("/api/simulador/iniciar")
async def iniciar(body: SimuladorIniciar) -> dict:
    cenarios = {"normal", "luto", "insonia", "celebracao"}
    if body.cenario not in cenarios:
        raise HTTPException(400, f"Cenário inválido. Use: {', '.join(sorted(cenarios))}")

    if body.modo == "ao_vivo":
        await simulador_live.iniciar_ao_vivo(body.cenario, body.velocidade)
    else:
        await simulador_batch.iniciar_batch(body.cenario, body.dias, body.velocidade)

    return status_simulador()


@router.post("/api/simulador/parar")
async def parar() -> dict:
    await simulador_live.parar()
    await simulador_batch.parar_batch()
    return status_simulador()
