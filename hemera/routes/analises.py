"""Endpoints de análises comportamentais (nível cômodo) — leitura agregada."""
import logging
from fastapi import APIRouter

from hemera.database import fetchall

log = logging.getLogger(__name__)
router = APIRouter()

_PRESENCA_JOIN = (
    "FROM leituras l "
    "JOIN sensores s ON l.sensor_id = s.id "
    "JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id AND ts.codigo = 'presenca' "
    "JOIN comodos c ON s.comodo_id = c.id "
)


@router.get("/api/analises/ocupacao-comodos")
def ocupacao_comodos() -> dict:
    """Tempo de permanência por cômodo: ticks com presença=1 vs total."""
    rows = fetchall(
        "SELECT c.id AS comodo_id, c.nome AS comodo, "
        "SUM(CASE WHEN l.valor >= 1 THEN 1 ELSE 0 END) AS ticks_ocupado, "
        "COUNT(*) AS ticks_total "
        + _PRESENCA_JOIN +
        "GROUP BY c.id, c.nome "
        "ORDER BY ticks_ocupado DESC"
    )
    comodos = []
    for r in rows:
        total = r["ticks_total"] or 0
        ocup = r["ticks_ocupado"] or 0
        comodos.append({
            "comodo_id": r["comodo_id"],
            "comodo": r["comodo"],
            "ticks_ocupado": ocup,
            "ticks_total": total,
            "percentual_ocupacao": round(100.0 * ocup / total, 1) if total else 0.0,
        })
    return {"comodos": comodos}


@router.get("/api/analises/atividade-horaria")
def atividade_horaria() -> dict:
    """Atividade (presença=1) por hora do dia: casa toda e por cômodo."""
    casa_rows = fetchall(
        "SELECT CAST(strftime('%H', l.registrado_em) AS INTEGER) AS hora, "
        "SUM(CASE WHEN l.valor >= 1 THEN 1 ELSE 0 END) AS ocupacoes "
        + _PRESENCA_JOIN +
        "GROUP BY hora"
    )
    casa_map = {r["hora"]: (r["ocupacoes"] or 0) for r in casa_rows if r["hora"] is not None}
    casa = [{"hora": h, "ocupacoes": casa_map.get(h, 0)} for h in range(24)]

    comodo_rows = fetchall(
        "SELECT c.nome AS comodo, CAST(strftime('%H', l.registrado_em) AS INTEGER) AS hora, "
        "SUM(CASE WHEN l.valor >= 1 THEN 1 ELSE 0 END) AS ocupacoes "
        + _PRESENCA_JOIN +
        "GROUP BY c.nome, hora"
    )
    por_comodo: dict[str, list[int]] = {}
    for r in comodo_rows:
        if r["hora"] is None:
            continue
        por_comodo.setdefault(r["comodo"], [0] * 24)[r["hora"]] = r["ocupacoes"] or 0
    por_comodo_list = [{"comodo": nome, "horas": horas} for nome, horas in sorted(por_comodo.items())]
    return {"casa": casa, "por_comodo": por_comodo_list}


@router.get("/api/analises/transicoes")
def transicoes() -> dict:
    """Padrões de movimentação (aproximado, nível casa): transições entre
    cômodos ocupados consecutivos na ordem do tempo."""
    rows = fetchall(
        "SELECT l.registrado_em, c.nome AS comodo "
        + _PRESENCA_JOIN +
        "WHERE l.valor >= 1 "
        "ORDER BY l.registrado_em, c.id"
    )
    contagem: dict[tuple[str, str], int] = {}
    anterior: str | None = None
    for r in rows:
        atual = r["comodo"]
        if anterior is not None and atual != anterior:
            chave = (anterior, atual)
            contagem[chave] = contagem.get(chave, 0) + 1
        anterior = atual
    transicoes_lista = [
        {"de": de, "para": para, "total": n}
        for (de, para), n in sorted(contagem.items(), key=lambda kv: kv[1], reverse=True)
    ][:15]
    return {"transicoes": transicoes_lista}


@router.get("/api/analises/alertas")
def alertas() -> dict:
    """Alertas comportamentais: desvios reais (por morador) + regras sobre leituras."""
    alertas_lista: list[dict] = []

    # (a) Desvios detectados pelo motor (reais, por morador), com texto menos clínico.
    desvios = fetchall(
        "SELECT m.nome AS morador, c.nome AS comodo, "
        "ROUND(dd.intensidade, 2) AS intensidade, dd.detectado_em AS quando "
        "FROM desvios_detectados dd "
        "JOIN moradores m ON dd.morador_id = m.id "
        "JOIN comodos c ON dd.comodo_id = c.id "
        "WHERE dd.intensidade >= 2.5 "
        "ORDER BY dd.detectado_em DESC "
        "LIMIT 12"
    )
    for d in desvios:
        intensidade = d["intensidade"] or 0
        alertas_lista.append({
            "tipo": "desvio",
            "severidade": "alta" if intensidade >= 4 else "media",
            "mensagem": f"Padrão diferente do habitual para {d['morador']} em {d['comodo']} "
                        f"({d['intensidade']}σ do baseline).",
            "quando": d["quando"],
            "morador": d["morador"],
            "comodo": d["comodo"],
        })

    # (b) Atividade em horário incomum (02h–05h) na cozinha/sala, agrupada para evitar ruído.
    noturno = fetchall(
        "SELECT c.nome AS comodo, MAX(l.registrado_em) AS quando, "
        "CAST(strftime('%H', l.registrado_em) AS INTEGER) AS hora, "
        "COUNT(*) AS total "
        + _PRESENCA_JOIN +
        "WHERE l.valor >= 1 AND c.nome IN ('cozinha', 'sala') "
        "AND CAST(strftime('%H', l.registrado_em) AS INTEGER) BETWEEN 2 AND 5 "
        "GROUP BY substr(l.registrado_em, 1, 10), c.nome, hora "
        "HAVING total >= 2 "
        "ORDER BY quando DESC LIMIT 6"
    )
    for n in noturno:
        alertas_lista.append({
            "tipo": "horario_incomum",
            "severidade": "media",
            "mensagem": f"Atividade noturna recorrente na {n['comodo']} por volta das {n['hora']}h "
                        f"({n['total']} registros).",
            "quando": n["quando"],
            "morador": None,
            "comodo": n["comodo"],
        })

    # (c) Uso do banheiro acima do habitual (dia com ocupação > 2× a média diária).
    banheiro = fetchall(
        "SELECT substr(l.registrado_em, 1, 10) AS dia, "
        "SUM(CASE WHEN l.valor >= 1 THEN 1 ELSE 0 END) AS ticks "
        + _PRESENCA_JOIN +
        "WHERE c.nome = 'banheiro' "
        "GROUP BY dia ORDER BY dia"
    )
    valores = [b["ticks"] or 0 for b in banheiro]
    if valores:
        media = sum(valores) / len(valores)
        for b in banheiro:
            ticks = b["ticks"] or 0
            limite = max(media * 2.5, media + 6)
            if media > 0 and ticks > limite:
                alertas_lista.append({
                    "tipo": "banheiro_excessivo",
                    "severidade": "media",
                    "mensagem": f"Tempo no banheiro acima do comum em {b['dia']} "
                                f"({ticks} registros vs média {media:.0f}).",
                    "quando": f"{b['dia']} 00:00:00",
                    "morador": None,
                    "comodo": "banheiro",
                })

    alertas_lista.sort(key=lambda a: a["quando"], reverse=True)
    return {"alertas": alertas_lista}
