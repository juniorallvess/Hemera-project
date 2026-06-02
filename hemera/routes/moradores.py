"""Endpoints de moradores e residências."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from hemera.database import fetchall, fetchone, get_connection

router = APIRouter()

# Valores extraídos do CHECK constraint em db/schema.sql
PERFIS_VALIDOS = ['adulto_pleno', 'home_office', 'jovem_adulto', 'idoso', 'crianca']


class NovoMorador(BaseModel):
    nome: str
    perfil: str
    data_nascimento: str
    residencia_id: int | None = None


@router.get("/api/residencias")
def listar_residencias() -> list[dict]:
    return fetchall("SELECT * FROM residencias ORDER BY id")


@router.get("/api/moradores/perfis")
def listar_perfis() -> list[str]:
    return PERFIS_VALIDOS


@router.get("/api/moradores")
def listar_moradores() -> list[dict]:
    return fetchall("""
        SELECT m.id, m.nome, m.data_nascimento, m.perfil, m.residencia_id,
               r.nome AS residencia
        FROM moradores m
        JOIN residencias r ON m.residencia_id = r.id
        ORDER BY m.id
    """)


@router.post("/api/moradores")
def criar_morador(body: NovoMorador) -> dict:
    if body.perfil not in PERFIS_VALIDOS:
        raise HTTPException(422, f"perfil inválido; valores aceitos: {PERFIS_VALIDOS}")
    residencia_id = body.residencia_id
    if residencia_id is None:
        res = fetchone("SELECT id FROM residencias ORDER BY id LIMIT 1")
        if not res:
            raise HTTPException(422, "Nenhuma residência cadastrada")
        residencia_id = res["id"]
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO moradores (residencia_id, nome, data_nascimento, perfil) "
            "VALUES (?, ?, ?, ?)",
            (residencia_id, body.nome, body.data_nascimento, body.perfil),
        )
        new_id = cur.lastrowid
    return fetchone("""
        SELECT m.id, m.nome, m.data_nascimento, m.perfil, m.residencia_id,
               r.nome AS residencia
        FROM moradores m JOIN residencias r ON m.residencia_id = r.id
        WHERE m.id=?
    """, (new_id,))


@router.delete("/api/moradores/{morador_id}")
def deletar_morador(morador_id: int) -> dict:
    if not fetchone("SELECT id FROM moradores WHERE id=?", (morador_id,)):
        raise HTTPException(404, "Morador não encontrado")
    with get_connection() as conn:
        # Eliminar dependentes em ordem FK-safe.
        # desvios_detectados.baseline_id → baselines ON DELETE RESTRICT:
        # apagar desvios antes de baselines para evitar violação de FK.
        conn.execute(
            "DELETE FROM acionamentos WHERE intervencao_id IN "
            "(SELECT id FROM intervencoes WHERE morador_id=?)", (morador_id,)
        )
        conn.execute(
            "DELETE FROM reacoes WHERE intervencao_id IN "
            "(SELECT id FROM intervencoes WHERE morador_id=?)", (morador_id,)
        )
        conn.execute("DELETE FROM intervencoes WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM desvios_detectados WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM baselines WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM padroes_comportamentais WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM aprendizado_pesos WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM bloqueios_temporarios WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM agendamentos_sutis WHERE morador_id=?", (morador_id,))
        conn.execute("DELETE FROM moradores WHERE id=?", (morador_id,))
    return {"ok": True, "id": morador_id}


@router.get("/api/comodos")
def listar_comodos() -> list[dict]:
    return fetchall("""
        SELECT c.id, c.nome, c.tipo, c.area_m2,
               COUNT(DISTINCT s.id) AS total_sensores,
               COUNT(DISTINCT d.id) AS total_dispositivos
        FROM comodos c
        LEFT JOIN sensores s    ON s.comodo_id = c.id
        LEFT JOIN dispositivos d ON d.comodo_id = c.id
        GROUP BY c.id
        ORDER BY c.id
    """)
