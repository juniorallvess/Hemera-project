"""Endpoints de intervenções."""
from fastapi import APIRouter, HTTPException
from hemera.database import fetchall, fetchone
from hemera.intervencoes import cancelar_intervencao

router = APIRouter()


@router.get("/api/intervencoes")
def listar_intervencoes(limit: int = 50) -> list[dict]:
    return fetchall("""
        SELECT i.id, m.nome AS morador, c.nome AS cena, co.nome AS comodo,
               i.executada_em, i.status
        FROM intervencoes i
        JOIN moradores m ON i.morador_id = m.id
        JOIN cenas c     ON i.cena_id    = c.id
        JOIN comodos co  ON i.comodo_id  = co.id
        ORDER BY i.executada_em DESC
        LIMIT ?
    """, (limit,))


@router.get("/api/desvios")
def listar_desvios(limit: int = 50) -> list[dict]:
    return fetchall("""
        SELECT d.id, m.nome AS morador, co.nome AS comodo,
               d.intensidade, d.detectado_em
        FROM desvios_detectados d
        JOIN moradores m ON d.morador_id = m.id
        JOIN comodos co  ON d.comodo_id  = co.id
        ORDER BY d.detectado_em DESC
        LIMIT ?
    """, (limit,))


@router.get("/api/contadores")
def contadores() -> dict:
    """Totais usados pelo cabeçalho do painel."""
    row = fetchone("""
        SELECT
            (SELECT COUNT(*) FROM leituras) AS leituras,
            (SELECT COUNT(*) FROM desvios_detectados) AS desvios,
            (SELECT COUNT(*) FROM intervencoes) AS intervencoes
    """)
    return row or {"leituras": 0, "desvios": 0, "intervencoes": 0}


@router.post("/api/intervencoes/{intervencao_id}/cancelar")
def cancelar(intervencao_id: int) -> dict:
    row = fetchone("SELECT id FROM intervencoes WHERE id=?", (intervencao_id,))
    if not row:
        raise HTTPException(404, "Intervenção não encontrada")
    cancelar_intervencao(intervencao_id)
    return {"ok": True}
