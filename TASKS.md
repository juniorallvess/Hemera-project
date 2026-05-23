# HEMERA — TASKS.md

> Checklist executável. Marcar `[x]` ao concluir cada item. Não pular itens.

---

## FASE 1 — Setup
- [ ] Criar árvore de diretórios completa conforme `PROJECT_BRIEF.md` §3.
- [ ] Criar `requirements.txt` com `fastapi`, `uvicorn[standard]`, `websockets`.
- [ ] Criar `.gitignore` (`*.db`, `__pycache__/`, `.venv/`, `*.pyc`).
- [ ] Criar `README.md` inicial com seção "Como rodar".
- [ ] Criar `hemera/config.py` com constantes: `DB_PATH`, `API_PORT=8000`, `MOTOR_INTERVAL_SECONDS=5`.
- [ ] Validar: `pip install -r requirements.txt` sem erros.

## FASE 2 — DDL (`db/schema.sql`)
- [ ] Tabela `residencias`
- [ ] Tabela `moradores` (com CHECK em `perfil`)
- [ ] Tabela `comodos` (com CHECK em `tipo`)
- [ ] Tabela `tipos_sensor` (UNIQUE em codigo)
- [ ] Tabela `tipos_dispositivo` (UNIQUE em codigo)
- [ ] Tabela `protocolos` (UNIQUE em codigo)
- [ ] Tabela `acoes_dispositivo` (UNIQUE em codigo)
- [ ] Tabela `sensores`
- [ ] Tabela `dispositivos`
- [ ] Tabela `leituras` (índice em `registrado_em` e `sensor_id`)
- [ ] Tabela `padroes_comportamentais`
- [ ] Tabela `baselines`
- [ ] Tabela `desvios_detectados`
- [ ] Tabela `cenas`
- [ ] Tabela `cena_dispositivo`
- [ ] Tabela `intervencoes` (CHECK em `status`)
- [ ] Tabela `acionamentos`
- [ ] Tabela `reacoes` (CHECK em `tipo_reacao`)
- [ ] Tabela `aprendizado_pesos`
- [ ] Tabela `bloqueios_temporarios`
- [ ] Tabela `agendamentos_sutis`
- [ ] Validar: `sqlite3 test.db < db/schema.sql` cria 22 tabelas.

## FASE 3 — DML Catálogos (`db/seed.sql`)
- [ ] INSERT 1 residência
- [ ] INSERT 3 moradores (Maria, Pedro, Lucas)
- [ ] INSERT 7 cômodos
- [ ] INSERT 8 tipos_sensor
- [ ] INSERT 7 tipos_dispositivo
- [ ] INSERT 9 acoes_dispositivo
- [ ] INSERT 5 protocolos
- [ ] INSERT 23 sensores distribuídos pelos cômodos
- [ ] INSERT 18 dispositivos distribuídos pelos cômodos
- [ ] INSERT 8 cenas com descrições
- [ ] INSERT 30+ linhas em cena_dispositivo
- [ ] INSERT agendamentos_sutis (1 por morador, ex: despertar_gradual 7h)
- [ ] Criar `scripts/init_db.py`
- [ ] Validar: `python scripts/init_db.py` → `SELECT COUNT(*) FROM sensores` = 23.

## FASE 4 — Simulador
- [ ] `simulador/relogio.py`: classe `RelogioSimulado` com data_atual, tick, velocidade
- [ ] `simulador/moradores.py`: perfis com função `presenca_em(comodo, momento)` retornando probabilidade
- [ ] `simulador/sensores.py`: classes `SensorPresenca`, `SensorFluxo`, `SensorAbertura`, `SensorDecibel`, `SensorIluminancia`, `SensorTemperatura`, `SensorUmidade`, `SensorConsumo`
- [ ] `simulador/cenarios.py`: classes `CenarioNormal`, `CenarioLuto`, `CenarioInsonia`, `CenarioCelebracao` com método `modificar_presenca`/`modificar_fluxo` etc
- [ ] `simulador/simulador.py`: CLI com argparse, loop principal
- [ ] Loop: para cada minuto simulado, para cada sensor, gera leitura, INSERT em batch
- [ ] Validar: `python -m simulador.simulador --cenario normal --dias 30 --velocidade 1440` termina <60s e gera >40k leituras.

## FASE 5 — Motor Hemera
- [ ] `hemera/database.py`: `get_connection()`, `execute()`, `fetchall()`, context manager
- [ ] `hemera/baseline.py`: função `calcular_baseline(morador_id)` agrega últimos 14 dias por cômodo×métrica
- [ ] `hemera/baseline.py`: função `salvar_baseline()` grava em tabela
- [ ] `hemera/motor.py`: função `detectar_desvios()` compara última hora vs baseline; INSERT em `desvios_detectados`
- [ ] `hemera/motor.py`: função `resolver_cena(morador_id, desvio_id)` consulta pesos + bloqueios + dispositivos disponíveis
- [ ] `hemera/intervencoes.py`: função `executar_intervencao(cena_id, morador_id, comodo_id, desvio_id)` faz INSERT em intervencoes + acionamentos
- [ ] `hemera/motor.py`: função `avaliar_reacao()` 10min depois compara padrão; registra reação
- [ ] Loop assíncrono no startup do FastAPI executa motor a cada 5s
- [ ] Validar: rodar `--cenario luto` produz registros em `intervencoes` após dia simulado 15+.

## FASE 6 — API + Frontend
- [ ] `hemera/main.py`: FastAPI app, monta StaticFiles, registra routers, startup task do motor
- [ ] `hemera/routes/moradores.py`: GET /api/moradores
- [ ] `hemera/routes/leituras.py`: GET /api/leituras/recentes, POST /api/leituras
- [ ] `hemera/routes/intervencoes.py`: GET, POST /cancelar
- [ ] `hemera/routes/ws.py`: WebSocket /ws com broadcast a clientes conectados
- [ ] Disparo de evento WS no motor após cada INSERT em desvios/intervencoes
- [ ] `hemera/static/planta.svg`: desenhar 7 retângulos rotulados (cômodos), círculos (sensores), ícones (dispositivos), todos com `id` único
- [ ] `hemera/static/index.html`: 4 áreas (planta, timeline, queries, controle)
- [ ] `hemera/static/style.css`: tema escuro/aconchegante, sem framework
- [ ] `hemera/static/app.js`: WebSocket client, atualiza SVG por id, popula timeline
- [ ] Validar: `uvicorn hemera.main:app` → http://localhost:8000 renderiza planta animada.

## FASE 7 — Queries DQL
- [ ] `db/queries.sql` com cabeçalho comentado por query
- [ ] Q01: WHERE com AND/OR/NOT
- [ ] Q02: INNER JOIN multi-tabela
- [ ] Q03: LEFT OUTER JOIN
- [ ] Q04: simulação de RIGHT JOIN (documentar limitação SQLite)
- [ ] Q05: FULL OUTER JOIN via UNION de LEFT
- [ ] Q06: GROUP BY
- [ ] Q07: HAVING
- [ ] Q08: ORDER BY DESC + ASC composto
- [ ] Q09: SUM, AVG, COUNT, MIN, MAX em uma única query
- [ ] Q10: UPPER, LOWER, LENGTH, CONCAT (`||` no SQLite)
- [ ] Q11: strftime para data/hora
- [ ] Q12: UNION de 3 SELECTs
- [ ] `hemera/routes/consultas.py`: 12 endpoints retornando JSON
- [ ] `app.js`: botões Q01-Q12 e renderizador de tabela genérico
- [ ] Validar: cada query executa via API e retorna linhas.

## FASE 8 — Scripts de Demo
- [ ] `scripts/run_demo.sh`: kill anterior, init_db, uvicorn em background, simulador em foreground
- [ ] `scripts/reset.sh`: apaga `hemera.db`, mata processos uvicorn/simulador
- [ ] Tornar scripts executáveis (`chmod +x`)
- [ ] Validar: terminal limpo, `bash scripts/run_demo.sh` levanta sistema em <30s.

## FASE 9 — README Final
- [ ] Seção: "O que é Hemera" (resumo do produto)
- [ ] Seção: "Stack"
- [ ] Seção: "Como instalar"
- [ ] Seção: "Como rodar a demo"
- [ ] Seção: "Estrutura do projeto" (árvore)
- [ ] Seção: "Modelo de dados" (ER em ASCII ou link)
- [ ] Seção: "As 12 queries DQL" (tabela com requisito e descrição)
- [ ] Seção: "Roteiro de apresentação" (script de 15 min para banca)
- [ ] Seção: "Limitações conhecidas" (sem hardware, sem auth, etc)
- [ ] Validar: ler README do zero como se fosse outro dev → conseguir rodar sem ajuda.

---

## SINAL DE CONCLUSÃO TOTAL

Quando todas as caixas estiverem marcadas:
- [ ] Rodar `bash scripts/run_demo.sh` em terminal limpo
- [ ] Abrir http://localhost:8000
- [ ] Aguardar 90 segundos
- [ ] Verificar: planta animada, timeline populada, 12 queries respondem, banco com >40k leituras

Se todos os 4 pontos acima estiverem OK: **projeto pronto para banca**.
