"""Endpoints de leituras de sensores."""
from fastapi import APIRouter
from pydantic import BaseModel
from hemera.database import fetchall
from hemera.leitura_events import inserir_leitura_com_evento

router = APIRouter()


class LeituraIn(BaseModel):
    sensor_id: int
    valor: float
    registrado_em: str | None = None


@router.get("/api/leituras/recentes")
def leituras_recentes(n: int = 50) -> list[dict]:
    return fetchall("""
        SELECT l.id, l.sensor_id, ts.codigo AS tipo, c.nome AS comodo,
               l.valor, l.registrado_em
        FROM leituras l
        JOIN sensores s    ON l.sensor_id = s.id
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        JOIN comodos c     ON s.comodo_id = c.id
        ORDER BY l.registrado_em DESC
        LIMIT ?
    """, (n,))


@router.post("/api/leituras", status_code=201)
def inserir_leitura(body: LeituraIn) -> dict:
    payload = inserir_leitura_com_evento(
        body.sensor_id, body.valor, body.registrado_em
    )
    return {"ok": True, **payload}
