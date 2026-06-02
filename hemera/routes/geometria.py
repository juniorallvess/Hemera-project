"""Endpoints de geometria espacial dos cômodos (polígonos sobre o SVG)."""
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from hemera.database import execute, fetchall, fetchone

log = logging.getLogger(__name__)
router = APIRouter()


class GeometriaIn(BaseModel):
    poligono: list[list[float]]


def _validar_poligono(poligono: list[list[float]]) -> None:
    if not isinstance(poligono, list) or len(poligono) < 3:
        raise HTTPException(status_code=400, detail="Polígono precisa de ao menos 3 vértices.")
    for ponto in poligono:
        if (not isinstance(ponto, (list, tuple)) or len(ponto) != 2
                or not all(isinstance(v, (int, float)) for v in ponto)):
            raise HTTPException(status_code=400, detail="Cada vértice deve ser um par [x, y] numérico.")


def _comodo_existe(comodo_id: int) -> dict | None:
    return fetchone("SELECT id, nome FROM comodos WHERE id = ?", (comodo_id,))


@router.get("/api/comodos/geometria")
def listar_geometria() -> dict:
    """Lista todos os cômodos com seu polígono (None se ainda não definido)."""
    rows = fetchall(
        "SELECT c.id AS comodo_id, c.nome AS comodo, g.poligono, g.atualizado_em "
        "FROM comodos c "
        "LEFT JOIN comodo_geometria g ON g.comodo_id = c.id "
        "ORDER BY c.id"
    )
    comodos = []
    for r in rows:
        comodos.append({
            "comodo_id": r["comodo_id"],
            "comodo": r["comodo"],
            "poligono": json.loads(r["poligono"]) if r["poligono"] else None,
            "atualizado_em": r["atualizado_em"],
        })
    return {"comodos": comodos}


@router.get("/api/comodos/{comodo_id}/geometria")
def obter_geometria(comodo_id: int) -> dict:
    """Retorna o polígono de um cômodo (None se não definido)."""
    comodo = _comodo_existe(comodo_id)
    if not comodo:
        raise HTTPException(status_code=404, detail="Cômodo não encontrado.")
    row = fetchone(
        "SELECT poligono, atualizado_em FROM comodo_geometria WHERE comodo_id = ?",
        (comodo_id,),
    )
    return {
        "comodo_id": comodo_id,
        "comodo": comodo["nome"],
        "poligono": json.loads(row["poligono"]) if row and row["poligono"] else None,
        "atualizado_em": row["atualizado_em"] if row else None,
    }


@router.put("/api/comodos/{comodo_id}/geometria")
def salvar_geometria(comodo_id: int, dados: GeometriaIn) -> dict:
    """Cria/atualiza o polígono de um cômodo (upsert). Coords no espaço viewBox 0 0 800 520."""
    comodo = _comodo_existe(comodo_id)
    if not comodo:
        raise HTTPException(status_code=404, detail="Cômodo não encontrado.")
    _validar_poligono(dados.poligono)
    payload = json.dumps(dados.poligono)
    execute(
        "INSERT INTO comodo_geometria (comodo_id, poligono, atualizado_em) "
        "VALUES (?, ?, datetime('now')) "
        "ON CONFLICT(comodo_id) DO UPDATE SET poligono = excluded.poligono, "
        "atualizado_em = datetime('now')",
        (comodo_id, payload),
    )
    return obter_geometria(comodo_id)


@router.delete("/api/comodos/{comodo_id}/geometria")
def apagar_geometria(comodo_id: int) -> dict:
    """Remove o polígono de um cômodo."""
    comodo = _comodo_existe(comodo_id)
    if not comodo:
        raise HTTPException(status_code=404, detail="Cômodo não encontrado.")
    execute("DELETE FROM comodo_geometria WHERE comodo_id = ?", (comodo_id,))
    return {"comodo_id": comodo_id, "comodo": comodo["nome"], "removido": True}
