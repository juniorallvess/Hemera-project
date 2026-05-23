# Hemera — Inteligência Ambiental Residencial

Sistema de detecção comportamental passiva e intervenção ambiental sutil. A casa lê telemetria de sensores e aciona cenas (luz, aroma, som, clima) quando detecta desvio do baseline habitual do morador — sem rótulos emocionais.

**Tema curatorial:** CASACOR 2026 — "Mente e Coração"

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| SGBD | SQLite 3 |
| Backend | Python 3.12 + FastAPI |
| SQL | `sqlite3` puro (sem ORM) |
| Frontend | React + Tailwind (Vite) → `hemera/static/` |
| Simulador | Python CLI |
| Visualização | SVG inline + WebSocket |

---

## Como Instalar

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**WebSocket (`● DESCONECTADO`, log `GET /ws 404` ou `No supported WebSocket library`):** o Uvicorn precisa do extra `standard`. Reinstale no venv ativo:

```bash
pip install 'uvicorn[standard]' websockets
# confirme:
python -c "import websockets; print('ok', websockets.__version__)"
```

Depois reinicie o servidor com `uvicorn hemera.main:app --port 8000` (não use `python -m uvicorn` de um Python do sistema sem o venv).

---

## Como Rodar a Demo

```bash
bash scripts/run_demo.sh
```

Abre http://localhost:8000 após ~5 segundos.

### Frontend (desenvolvimento com hot reload)

```bash
uvicorn hemera.main:app --port 8000   # terminal 1
cd frontend && npm install && npm run dev   # terminal 2 → http://localhost:5173
```

Build de produção: `cd frontend && npm run build` (ver [`frontend/README.md`](frontend/README.md)).

---

## Estrutura do Projeto

```
hemera/
├── db/                    # schema.sql, seed.sql, queries.sql, hemera.db
├── simulador/             # gerador de telemetria comportamental
├── hemera/                # FastAPI app + motor de detecção
│   ├── routes/            # endpoints REST + WebSocket
│   └── static/            # build React + planta.svg
├── frontend/              # código-fonte React + Tailwind
└── scripts/               # init_db.py, run_demo.sh, reset.sh
```

---

## Modelo de Dados

```
residencias ──< comodos ──< dispositivos
                    │           └──< acionamentos
                    └──< sensores ──< leituras

moradores >── residencias
moradores ──< baselines
moradores ──< desvios_detectados ──< intervencoes ──< reacoes
cenas ──< cena_dispositivo
cenas ──< aprendizado_pesos >── moradores
cenas ──< bloqueios_temporarios >── moradores
cenas ──< agendamentos_sutis
```

22 tabelas, normalizado até 3FN.

---

## As 12 Queries DQL

| # | Requisito SQL | Pergunta de Negócio |
|---|---------------|---------------------|
| Q01 | WHERE + AND/OR/NOT | Desvios últimos 7 dias em cômodos com presença E iluminância |
| Q02 | INNER JOIN | Intervenções com morador, cena, cômodo e timestamp |
| Q03 | LEFT OUTER JOIN | Cômodos sem nenhum sensor cadastrado |
| Q04 | RIGHT JOIN simulado | Sensores que nunca geraram leitura |
| Q05 | FULL OUTER JOIN | Reconciliação cenas × tipos_dispositivo |
| Q06 | GROUP BY | Total de intervenções por cômodo no último mês |
| Q07 | HAVING | Cenas com taxa aceite_implicito > 60% |
| Q08 | ORDER BY | Sensores por volume de leituras DESC, nome ASC |
| Q09 | SUM/AVG/COUNT/MIN/MAX | Estatísticas duração desvio→intervenção |
| Q10 | Funções de string | Relatório UPPER/LOWER/LENGTH das últimas 20 intervenções |
| Q11 | Funções de data | Intervenções por dia da semana e hora (strftime) |
| Q12 | UNION | Linha do tempo: leituras + intervenções + agendamentos |

---

## Roteiro de Apresentação (15 min)

1. **[0-2 min]** Contexto: CASACOR 2026, princípio de não-rotulação emocional.
2. **[2-4 min]** Modelo de dados: mostrar `db/schema.sql`, explicar 3FN, FKs, CHECKs.
3. **[4-6 min]** Simulador: rodar `--cenario luto`, explicar cenários comportamentais.
4. **[6-9 min]** Motor Hemera: mostrar desvios detectados e intervenções geradas em tempo real no painel.
5. **[9-13 min]** Queries DQL: clicar Q01–Q12 no painel, explicar cada requisito SQL atendido.
6. **[13-15 min]** Inspecionar banco via `sqlite3 db/hemera.db`, validar schema e contagens.

---

## Ajustes de Demo (pré-apresentação)

- **`db/fix_demo_data.sql`**: Executado automaticamente por `init_db.py`. Insere:
  - Cômodo "lavanderia" (sem sensores) → valida **Q03** (LEFT JOIN — gap de cobertura)
  - Sensor de umidade extra no escritório (`ativo=1`, sem leituras) → valida **Q04** (RIGHT JOIN simulado)
- **Sensores ignorados** (`hemera/config.py` → `SENSOR_IGNORADOS`): Lista de IDs de sensores que o simulador não gera leituras, mesmo sendo `ativo=1`. Garante que Q04 retorne resultados.
- **Sistema de reações** (`hemera/motor.py`): Avaliação de reações síncrona baseada em timestamps simulados. Após 10 min simulados, compara desvio original vs atual: reduziu → `aceite_implicito`; persiste → `ignorada`. ~15% canceladas pelo morador (simulado).
- **Bloqueios temporários**: Após 3 reações `cancelada` da mesma cena/morador, cria bloqueio de 7 dias.
- **Volume-alvo**: ~63k leituras (30 dias × 23 sensores × 96 leituras/dia com passo de 15 min).

---

## Limitações Conhecidas

- Sem hardware físico (sensores simulados em software).
- Sem autenticação real (acadêmico).
- Sem deploy em produção.
- SQLite não suporta RIGHT JOIN nativo — Q04 usa LEFT JOIN invertido (documentado em queries.sql).
- Sem testes automatizados extensivos.
