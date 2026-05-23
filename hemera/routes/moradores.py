"""Endpoints de moradores e residências."""
from fastapi import APIRouter
from hemera.database import fetchall

router = APIRouter()


@router.get("/api/residencias")
def listar_residencias() -> list[dict]:
    return fetchall("SELECT * FROM residencias ORDER BY id")


@router.get("/api/moradores")
def listar_moradores() -> list[dict]:
    return fetchall("""
        SELECT m.id, m.nome, m.data_nascimento, m.perfil, r.nome AS residencia
        FROM moradores m
        JOIN residencias r ON m.residencia_id = r.id
        ORDER BY m.id
    """)


@router.get("/api/comodos")
def listar_comodos() -> list[dict]:
    comodos = fetchall("""
        SELECT c.id, c.nome, c.tipo, c.area_m2,
               COUNT(DISTINCT s.id) AS total_sensores,
               COUNT(DISTINCT d.id) AS total_dispositivos
        FROM comodos c
        LEFT JOIN sensores s    ON s.comodo_id = c.id
        LEFT JOIN dispositivos d ON d.comodo_id = c.id
        GROUP BY c.id
        ORDER BY c.id
    """)
    return comodos
