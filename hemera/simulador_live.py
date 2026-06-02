"""Simulação ao vivo: moradores movem-se entre cômodos (presença via WS)."""
import asyncio
import logging
import random
from datetime import datetime, timedelta

from hemera.database import fetchall, fetchone
from hemera.leitura_events import inserir_leitura_com_evento
from simulador.moradores import PerfilMorador, criar_moradores

log = logging.getLogger(__name__)

_estado: dict = {
    "rodando": False,
    "modo": None,
    "cenario": "luto",
    "velocidade": 1,
    "dia_simulado": 1,
    "tick": 0,
}
_task: asyncio.Task | None = None
_ws_broadcast = None


def registrar_ws_broadcast(cb) -> None:
    global _ws_broadcast
    _ws_broadcast = cb


def obter_estado() -> dict:
    return dict(_estado)


def _perfis_do_banco() -> list[PerfilMorador]:
    """Um PerfilMorador para CADA morador do banco (inclui os criados via UI),
    reusando as tabelas de presença do simulador por tipo de perfil."""
    templates = {p.perfil: p.presenca for p in criar_moradores()}
    padrao = templates.get("adulto_pleno") or next(iter(templates.values()))
    perfis: list[PerfilMorador] = []
    for m in fetchall("SELECT id, nome, perfil FROM moradores"):
        perfis.append(PerfilMorador(
            morador_id=m["id"], nome=m["nome"], perfil=m["perfil"],
            presenca=templates.get(m["perfil"], padrao),
        ))
    return perfis


def _sensores_ativos() -> list[dict]:
    """Sensores ativos (id, comodo_id, comodo, tipo), excluindo SENSOR_IGNORADOS."""
    from simulador.config import SENSOR_IGNORADOS
    rows = fetchall(
        "SELECT s.id, s.comodo_id, c.nome AS comodo, ts.codigo AS tipo "
        "FROM sensores s "
        "JOIN comodos c ON s.comodo_id = c.id "
        "JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id "
        "WHERE s.ativo = 1"
    )
    return [s for s in rows if s["id"] not in SENSOR_IGNORADOS]


async def _loop_ao_vivo(intervalo: float, passo_min: int = 10) -> None:
    from simulador.cenarios import CENARIOS
    from simulador.sensores import SENSOR_CLASSES

    perfis = _perfis_do_banco()
    sensores = _sensores_ativos()
    if not perfis or not sensores:
        return
    instancias = {s["tipo"]: SENSOR_CLASSES[s["tipo"]]()
                  for s in sensores if s["tipo"] in SENSOR_CLASSES}
    comodos_distintos = sorted({s["comodo"] for s in sensores})
    comodo_id_por_nome = {s["comodo"]: s["comodo_id"] for s in sensores}
    cenario = CENARIOS.get(_estado["cenario"], CENARIOS["normal"])()

    momento = datetime.now().replace(second=0, microsecond=0)

    while _estado["rodando"] and _estado["modo"] == "ao_vivo":
        momento += timedelta(minutes=passo_min)
        dia_simulado = _estado["dia_simulado"]

        # Presença resolvida UMA vez por cômodo (coerência entre sensores).
        presentes_por_comodo: dict[str, int] = {}
        for comodo_nome in comodos_distintos:
            mod_pres = sum(
                cenario.modificador_presenca(m.morador_id, comodo_nome, momento, dia_simulado)
                for m in perfis
            ) / len(perfis)
            presentes_por_comodo[comodo_nome] = sum(
                1 for m in perfis
                if random.random() < m.presenca_em(comodo_nome, momento) * mod_pres
            )

        # Telemetria COMPLETA por sensor → persiste + emite evento de leitura.
        ts = momento.strftime("%Y-%m-%d %H:%M:%S")
        for sensor in sensores:
            tipo = sensor["tipo"]
            if tipo not in instancias:
                continue
            comodo_nome = sensor["comodo"]
            presentes = presentes_por_comodo[comodo_nome]
            if tipo == "decibel":
                modificador = sum(cenario.modificador_decibel(m.morador_id, comodo_nome, momento, dia_simulado) for m in perfis) / len(perfis)
            elif tipo == "fluxo_agua":
                modificador = sum(cenario.modificador_fluxo(m.morador_id, comodo_nome, momento, dia_simulado) for m in perfis) / len(perfis)
            else:
                modificador = 1.0
            valor = instancias[tipo].gerar(sensor["id"], comodo_nome, momento, presentes, modificador)
            inserir_leitura_com_evento(sensor["id"], valor, ts)

        if _ws_broadcast:
            # Estado de cada cômodo → o frontend acende (ocupado) / apaga (vazio).
            for comodo_nome in comodos_distintos:
                _ws_broadcast({
                    "tipo": "comodo_estado",
                    "comodo": comodo_nome,
                    "comodo_id": comodo_id_por_nome[comodo_nome],
                    "ocupado": presentes_por_comodo[comodo_nome] > 0,
                    "presentes": presentes_por_comodo[comodo_nome],
                })
            # Posição aproximada de cada morador presente (dot no SVG).
            for m in perfis:
                melhor, melhor_p = None, 0.0
                for comodo_nome in comodos_distintos:
                    if presentes_por_comodo[comodo_nome] <= 0:
                        continue
                    p = m.presenca_em(comodo_nome, momento)
                    if p > melhor_p:
                        melhor_p, melhor = p, comodo_nome
                if melhor:
                    _ws_broadcast({
                        "tipo": "morador_movimento",
                        "morador_id": m.morador_id,
                        "comodo_id": comodo_id_por_nome[melhor],
                        "comodo": melhor,
                    })

        _estado["tick"] += 1
        _estado["dia_simulado"] = min(30, 1 + _estado["tick"] // 144)
        await asyncio.sleep(intervalo)


async def iniciar_ao_vivo(cenario: str = "luto", velocidade: int = 1) -> None:
    global _task
    await parar()
    _estado.update({
        "rodando": True,
        "modo": "ao_vivo",
        "cenario": cenario,
        "velocidade": max(1, min(velocidade, 60)),
        "dia_simulado": 1,
        "tick": 0,
    })
    intervalo = max(0.4, 3.0 / _estado["velocidade"])
    try:
        from hemera.baseline import salvar_baseline
        for m in fetchall("SELECT id FROM moradores"):
            salvar_baseline(m["id"])
    except Exception as e:
        log.warning("Baseline inicial (ao vivo) falhou: %s", e)
    _task = asyncio.create_task(_loop_ao_vivo(intervalo))
    log.info("Simulação ao vivo iniciada (cenario=%s, intervalo=%.1fs)", cenario, intervalo)


async def parar() -> None:
    global _task
    _estado["rodando"] = False
    _estado["modo"] = None
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    _task = None
