"""Aba Avançado (BD): documentação de modelo (DDL) e motor de busca estruturado.

A busca NUNCA executa SQL livre: um whitelist de entidades/campos/operadores é
traduzido em um SELECT parametrizado (somente leitura) no servidor.
"""
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from hemera.config import BASE_DIR
from hemera.database import fetchall

log = logging.getLogger(__name__)
router = APIRouter()

# --- Whitelist de entidades pesquisáveis (somente leitura) -------------------
ENTIDADES: dict[str, dict] = {
    "moradores": {
        "colunas": "m.id, m.nome, m.perfil, m.data_nascimento",
        "base": "FROM moradores m",
        "campos": {
            "nome": {"expr": "m.nome", "tipo": "texto"},
            "perfil": {"expr": "m.perfil", "tipo": "texto"},
            "data_nascimento": {"expr": "m.data_nascimento", "tipo": "texto"},
        },
    },
    "comodos": {
        "colunas": "c.id, c.nome, c.tipo, c.area_m2",
        "base": "FROM comodos c",
        "campos": {
            "nome": {"expr": "c.nome", "tipo": "texto"},
            "tipo": {"expr": "c.tipo", "tipo": "texto"},
            "area_m2": {"expr": "c.area_m2", "tipo": "numero"},
        },
    },
    "sensores": {
        "colunas": "s.id, ts.codigo AS tipo, c.nome AS comodo, s.fabricante, s.ativo",
        "base": ("FROM sensores s "
                 "JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id "
                 "JOIN comodos c ON s.comodo_id = c.id"),
        "campos": {
            "tipo": {"expr": "ts.codigo", "tipo": "texto"},
            "comodo": {"expr": "c.nome", "tipo": "texto"},
            "fabricante": {"expr": "s.fabricante", "tipo": "texto"},
            "ativo": {"expr": "s.ativo", "tipo": "numero"},
        },
    },
    "leituras": {
        "colunas": "l.id, ts.codigo AS tipo, c.nome AS comodo, l.valor, l.registrado_em",
        "base": ("FROM leituras l "
                 "JOIN sensores s ON l.sensor_id = s.id "
                 "JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id "
                 "JOIN comodos c ON s.comodo_id = c.id"),
        "campos": {
            "tipo": {"expr": "ts.codigo", "tipo": "texto"},
            "comodo": {"expr": "c.nome", "tipo": "texto"},
            "valor": {"expr": "l.valor", "tipo": "numero"},
            "registrado_em": {"expr": "l.registrado_em", "tipo": "texto"},
        },
    },
    "intervencoes": {
        "colunas": "i.id, m.nome AS morador, ce.nome AS cena, c.nome AS comodo, i.status, i.executada_em",
        "base": ("FROM intervencoes i "
                 "JOIN moradores m ON i.morador_id = m.id "
                 "JOIN cenas ce ON i.cena_id = ce.id "
                 "JOIN comodos c ON i.comodo_id = c.id"),
        "campos": {
            "morador": {"expr": "m.nome", "tipo": "texto"},
            "cena": {"expr": "ce.nome", "tipo": "texto"},
            "comodo": {"expr": "c.nome", "tipo": "texto"},
            "status": {"expr": "i.status", "tipo": "texto"},
            "executada_em": {"expr": "i.executada_em", "tipo": "texto"},
        },
    },
    "desvios_detectados": {
        "colunas": "dd.id, m.nome AS morador, c.nome AS comodo, dd.intensidade, dd.detectado_em",
        "base": ("FROM desvios_detectados dd "
                 "JOIN moradores m ON dd.morador_id = m.id "
                 "JOIN comodos c ON dd.comodo_id = c.id"),
        "campos": {
            "morador": {"expr": "m.nome", "tipo": "texto"},
            "comodo": {"expr": "c.nome", "tipo": "texto"},
            "intensidade": {"expr": "dd.intensidade", "tipo": "numero"},
            "detectado_em": {"expr": "dd.detectado_em", "tipo": "texto"},
        },
    },
}

OPERADORES: dict[str, set[str]] = {
    "texto": {"=", "!=", "LIKE"},
    "numero": {"=", "!=", ">", "<", ">=", "<="},
}

LIMITE_PADRAO = 200
LIMITE_MAX = 500


class Condicao(BaseModel):
    campo: str
    operador: str
    valor: Any


class Grupo(BaseModel):
    combinador: str = "AND"
    condicoes: list[Condicao] = []


class BuscaIn(BaseModel):
    entidade: str
    combinador: str = "AND"
    condicoes: list[Condicao] | None = None
    grupos: list[Grupo] | None = None
    limite: int | None = None


def _combinador_valido(c: str) -> str:
    cc = (c or "AND").strip().upper()
    if cc not in ("AND", "OR"):
        raise HTTPException(status_code=400, detail=f"Combinador inválido: {c}")
    return cc


def _condicao_sql(entidade: str, cond: Condicao) -> tuple[str, Any]:
    """Valida 1 condição contra o whitelist e retorna (fragmento_sql, valor_param)."""
    meta = ENTIDADES[entidade]["campos"].get(cond.campo)
    if not meta:
        raise HTTPException(status_code=400, detail=f"Campo não permitido: {cond.campo}")
    operador = (cond.operador or "").strip().upper()
    if operador not in OPERADORES[meta["tipo"]]:
        raise HTTPException(status_code=400,
                            detail=f"Operador '{cond.operador}' inválido para campo '{cond.campo}'.")
    valor = cond.valor
    if meta["tipo"] == "numero":
        try:
            valor = float(valor)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"Valor numérico inválido para '{cond.campo}'.")
    else:
        valor = str(valor)
        if operador == "LIKE":
            valor = f"%{valor}%"
    return f"{meta['expr']} {operador} ?", valor


@router.get("/api/modelo/ddl")
def modelo_ddl() -> dict:
    """Modelo físico: retorna o DDL completo (db/schema.sql)."""
    caminho = BASE_DIR / "db" / "schema.sql"
    try:
        ddl = caminho.read_text(encoding="utf-8")
    except OSError:
        ddl = ""
    return {"ddl": ddl}


@router.get("/api/busca/entidades")
def busca_entidades() -> dict:
    """Metadados do whitelist para o frontend montar os dropdowns."""
    saida: dict[str, dict] = {}
    for nome, meta in ENTIDADES.items():
        saida[nome] = {
            campo: {"tipo": info["tipo"], "operadores": sorted(OPERADORES[info["tipo"]])}
            for campo, info in meta["campos"].items()
        }
    return {"entidades": saida}


@router.post("/api/busca")
def executar_busca(dados: BuscaIn) -> dict:
    """Traduz o spec estruturado em um SELECT parametrizado (somente leitura)."""
    if dados.entidade not in ENTIDADES:
        raise HTTPException(status_code=400, detail=f"Entidade não permitida: {dados.entidade}")
    entidade = ENTIDADES[dados.entidade]
    topo = _combinador_valido(dados.combinador)

    params: list[Any] = []
    where = ""

    if dados.grupos:
        partes_grupo: list[str] = []
        for grupo in dados.grupos:
            comb_g = _combinador_valido(grupo.combinador)
            frags: list[str] = []
            for cond in grupo.condicoes:
                frag, val = _condicao_sql(dados.entidade, cond)
                frags.append(frag)
                params.append(val)
            if frags:
                partes_grupo.append("(" + f" {comb_g} ".join(frags) + ")")
        if partes_grupo:
            where = " WHERE " + f" {topo} ".join(partes_grupo)
    elif dados.condicoes:
        frags = []
        for cond in dados.condicoes:
            frag, val = _condicao_sql(dados.entidade, cond)
            frags.append(frag)
            params.append(val)
        if frags:
            where = " WHERE " + f" {topo} ".join(frags)

    limite = LIMITE_PADRAO
    if dados.limite is not None:
        limite = max(1, min(int(dados.limite), LIMITE_MAX))

    sql = f"SELECT {entidade['colunas']} {entidade['base']}{where} LIMIT ?"
    params_exec = params + [limite]
    linhas = fetchall(sql, tuple(params_exec))
    colunas = list(linhas[0].keys()) if linhas else []
    return {"sql": sql, "params": params_exec, "colunas": colunas, "linhas": linhas, "total": len(linhas)}
