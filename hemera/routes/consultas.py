"""Endpoints para as 12 queries DQL de avaliação."""
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException
from hemera.database import fetchall

router = APIRouter()

_QUERIES_SQL = Path(__file__).parent.parent.parent / "db" / "queries.sql"


def _extrair_queries(sql: str) -> dict[int, str]:
    """
    Extrai as queries numeradas do arquivo queries.sql.
    Identificadas pelo padrão '-- Q<N>'.
    Para Q04 e Q11 que têm sub-blocos, usa a última instrução SELECT.
    """
    blocos: dict[int, str] = {}
    partes = re.split(r'-- Q(\d+)', sql)
    # partes[0] = texto antes do primeiro bloco
    # partes[1,3,5,...] = número, partes[2,4,6,...] = corpo
    i = 1
    while i < len(partes) - 1:
        num = int(partes[i])
        corpo = partes[i + 1]
        # Divide em statements por ';', filtra os que contêm SELECT
        stmts = re.split(r';', corpo)
        sql_stmt = ""
        for s in stmts:
            # Extrai apenas a parte SELECT de cada stmt (descarta linhas de comentário)
            linhas = s.split('\n')
            sql_lines = []
            in_select = False
            for linha in linhas:
                stripped = linha.strip()
                if stripped.startswith('--') and not in_select:
                    continue
                if re.match(r'^\s*(SELECT|WITH)', stripped, re.I):
                    in_select = True
                if in_select:
                    sql_lines.append(linha)
            candidate = '\n'.join(sql_lines).strip()
            if candidate:
                sql_stmt = candidate  # sobrescreve — usa último SELECT do bloco (Q04 real)
        if sql_stmt:
            blocos[num] = sql_stmt
        i += 2
    return blocos


_CACHE: dict[int, str] | None = None


def _get_query(n: int) -> str:
    global _CACHE
    if _CACHE is None:
        _CACHE = _extrair_queries(_QUERIES_SQL.read_text())
    q = _CACHE.get(n)
    if not q:
        raise HTTPException(404, f"Query Q{n:02d} não encontrada")
    return q


def _endpoint(n: int):
    async def handler():
        q = _get_query(n)
        try:
            rows = fetchall(q)
        except Exception as e:
            raise HTTPException(500, str(e))
        return {"query": f"Q{n:02d}", "total": len(rows), "rows": rows}
    handler.__name__ = f"q{n:02d}"
    return handler


for _n in range(1, 13):
    router.add_api_route(f"/api/consultas/q{_n}", _endpoint(_n), methods=["GET"])
