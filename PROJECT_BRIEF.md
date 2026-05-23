# HEMERA — Project Brief para Claude Code

> **Documento mestre.** Leia integralmente antes de iniciar. Execute fase a fase. Não pule fases. Cada fase tem critério de aceite — só avance após validá-lo.

---

## 0. CONTEXTO DO PRODUTO

**Hemera** é uma camada de inteligência ambiental para residências automatizadas. A casa lê telemetria comportamental passiva (sensores de presença, iluminação, fluxo, abertura) e aciona intervenções ambientais sutis (luz, aroma, som, clima) quando detecta **desvio do baseline habitual** do morador — sem nunca pedir ao usuário que rotule seu estado emocional.

**Princípio inegociável:** o sistema **nunca armazena rótulos emocionais**. Apenas padrões comportamentais e reações a intervenções.

**Tema curatorial:** CASACOR 2026 — "Mente e Coração". A casa como espaço de cura, antídoto ao FOMO e à hiperconectividade.

---

## 1. ESCOPO DESTE PROJETO

Entregável acadêmico para avaliação de Banco de Dados que comprove:
- Modelo normalizado até 3FN com FKs, constraints e CHECKs.
- DML de povoamento coerente com o domínio.
- 12 consultas DQL cobrindo `WHERE`, `JOIN`s (INNER, LEFT, RIGHT, FULL), `GROUP BY`, `HAVING`, `ORDER BY`, funções agregadas, string e data, `UNION`.
- Aplicação que conecta ao banco, persiste e consulta dados, simulando cenário real.

**Não-escopo:** hardware físico, autenticação real, deploy em produção, testes automatizados extensivos.

---

## 2. STACK FIXADA (NÃO ALTERAR)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| SGBD | SQLite 3 | Zero infra, arquivo único, suporta CTE, JOINs completos |
| Backend | Python 3.12 + FastAPI | API REST + servir HTML estático no mesmo processo |
| ORM | **Nenhum** — `sqlite3` puro | A avaliação cobra SQL explícito; ORM esconde queries |
| Frontend | HTML + CSS + JS vanilla | Sem build, sem npm, servido por `StaticFiles` do FastAPI |
| Simulador | Python puro (script CLI) | Roda independente, popula o banco |
| Visualização | SVG inline + WebSocket | Planta da casa anima em tempo real |

**Pacotes Python obrigatórios:** `fastapi`, `uvicorn[standard]`, `websockets`. Nada além disso.

---

## 3. ESTRUTURA DE DIRETÓRIOS

```
hemera/
├── README.md
├── requirements.txt
├── PROJECT_BRIEF.md          ← este arquivo
├── TASKS.md                  ← checklist executável
│
├── db/
│   ├── schema.sql            ← DDL completo
│   ├── seed.sql              ← DML de catálogos
│   ├── queries.sql           ← 12 consultas DQL da avaliação
│   └── hemera.db             ← gerado em runtime
│
├── simulador/
│   ├── __init__.py
│   ├── simulador.py          ← entrypoint CLI
│   ├── moradores.py          ← perfis e rotinas
│   ├── sensores.py           ← classes geradoras de leitura
│   ├── cenarios.py           ← normal, luto, insônia, celebração
│   └── relogio.py            ← gerenciador de tempo acelerado
│
├── hemera/
│   ├── __init__.py
│   ├── main.py               ← FastAPI app
│   ├── database.py           ← conexão SQLite, helpers
│   ├── motor.py              ← detector de desvio + executor de cenas
│   ├── baseline.py           ← cálculo de padrão habitual
│   ├── intervencoes.py       ← registro e revogação
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── moradores.py
│   │   ├── leituras.py
│   │   ├── intervencoes.py
│   │   ├── consultas.py      ← endpoints que executam as 12 queries
│   │   └── ws.py             ← WebSocket para painel
│   └── static/
│       ├── index.html        ← painel principal
│       ├── style.css
│       ├── planta.svg        ← planta da casa
│       └── app.js            ← cliente WebSocket + atualização DOM
│
└── scripts/
    ├── init_db.py            ← cria DB, executa schema.sql e seed.sql
    ├── run_demo.sh           ← inicia simulador + servidor em paralelo
    └── reset.sh              ← apaga banco e recomeça
```

---

## 4. MODELO DE DADOS (3FN)

### 4.1 Diagrama Conceitual

```
residencias ──< comodos ──< dispositivos
                    │           │
                    │           └──< acionamentos
                    │
                    └──< sensores ──< leituras

moradores >── residencias
moradores ──< padroes_comportamentais
moradores ──< baselines
moradores ──< desvios_detectados ──< intervencoes ──< reacoes
                                          │
cenas ──< cena_dispositivo >── dispositivos
cenas ──< intervencoes
cenas ──< aprendizado_pesos >── moradores
cenas ──< bloqueios_temporarios >── moradores
cenas ──< agendamentos_sutis
```

### 4.2 Tabelas (resumo — DDL completo na Fase 2)

| Tabela | Colunas-chave | FKs |
|---|---|---|
| `residencias` | id, nome, endereco, data_instalacao | — |
| `moradores` | id, residencia_id, nome, data_nascimento, perfil | → residencias |
| `comodos` | id, residencia_id, nome, tipo, area_m2 | → residencias |
| `tipos_sensor` | id, codigo, descricao, unidade_medida | — |
| `tipos_dispositivo` | id, codigo, descricao | — |
| `protocolos` | id, codigo, descricao | — |
| `sensores` | id, comodo_id, tipo_sensor_id, protocolo_id, fabricante, ativo | → comodos, tipos_sensor, protocolos |
| `dispositivos` | id, comodo_id, tipo_dispositivo_id, protocolo_id, fabricante, ativo | → comodos, tipos_dispositivo, protocolos |
| `leituras` | id, sensor_id, valor, registrado_em | → sensores |
| `padroes_comportamentais` | id, morador_id, janela_inicio, janela_fim, comodo_id, metrica, valor | → moradores, comodos |
| `baselines` | id, morador_id, comodo_id, metrica, valor_medio, desvio_padrao, calculado_em | → moradores, comodos |
| `desvios_detectados` | id, morador_id, comodo_id, baseline_id, intensidade, detectado_em | → moradores, comodos, baselines |
| `cenas` | id, nome, descricao, ativa | — |
| `acoes_dispositivo` | id, codigo, descricao | — |
| `cena_dispositivo` | id, cena_id, tipo_dispositivo_id, acao_id, intensidade, duracao_segundos | → cenas, tipos_dispositivo, acoes_dispositivo |
| `intervencoes` | id, desvio_id, cena_id, morador_id, comodo_id, executada_em, status | → desvios_detectados, cenas, moradores, comodos |
| `acionamentos` | id, intervencao_id, dispositivo_id, acao_id, intensidade, acionado_em | → intervencoes, dispositivos, acoes_dispositivo |
| `reacoes` | id, intervencao_id, tipo_reacao, registrada_em | → intervencoes |
| `aprendizado_pesos` | id, morador_id, cena_id, peso, atualizado_em | → moradores, cenas |
| `bloqueios_temporarios` | id, morador_id, cena_id, ate | → moradores, cenas |
| `agendamentos_sutis` | id, morador_id, cena_id, dia_semana, horario, ativo | → moradores, cenas |

**Constraints obrigatórias:**
- Toda tabela com FK declara `ON DELETE` (CASCADE ou RESTRICT, conforme semântica).
- `CHECK` em colunas categóricas (`perfil` em moradores, `status` em intervenções, `tipo_reacao` em reações).
- `NOT NULL` em todas FKs e colunas obrigatórias.
- `UNIQUE` em códigos de catálogo (`tipos_sensor.codigo`, etc.).
- `DEFAULT CURRENT_TIMESTAMP` em colunas de timestamp.

### 4.3 Catálogos a Popular (`seed.sql`)

**tipos_sensor:** presenca, fluxo_agua, abertura_porta, decibel_ambiente, iluminancia, temperatura, umidade, consumo_energia.

**tipos_dispositivo:** lampada, cortina, ar_condicionado, difusor_aroma, alto_falante, fechadura, aquecedor.

**acoes_dispositivo:** ligar, desligar, dim, abrir, fechar, ajustar_temperatura, tocar_playlist, ajustar_volume, ativar_aroma.

**protocolos:** zigbee, matter, knx, mqtt, zwave.

**cenas (8 mínimas):**
1. `acolhimento_noturno` — luz âmbar 2200K @ 15% + difusor lavanda + playlist habitual em vol. baixo
2. `despertar_gradual` — cortina abre 20%/min + luz quente crescente
3. `silencio_protetivo` — desliga sons ambiente + dim em 30%
4. `convite_movimento` — acende cozinha + inicia playlist energética em vol. mínimo
5. `descompressao_chegada` — luz quente sala + cortina fecha + AC 23°C
6. `noite_serena` — fecha cortinas + dim geral + difusor camomila
7. `manha_silenciosa` — cortina 50% + sem som + luz natural
8. `presenca_companhia` — som ambiente baixo + iluminação cálida (anti-isolamento)

---

## 5. SIMULADOR — ESPECIFICAÇÃO COMPORTAMENTAL

### 5.1 Família Simulada

| Morador | Idade | Perfil | Rotina Base |
|---|---|---|---|
| Maria | 52 | adulto_pleno | Sai 7h30 / volta 18h / dorme 23h / banho 22h |
| Pedro | 54 | home_office | Café da manhã 7h / escritório 8h-18h / jantar 20h / dorme 23h30 |
| Lucas | 18 | jovem_adulto | Acorda 9h / fora 13h-19h / sono irregular |

### 5.2 Cômodos e Sensores

7 cômodos × 2-4 sensores cada = **~23 sensores totais.**
8 cômodos × 1-3 dispositivos = **~18 dispositivos totais.**

| Cômodo | Sensores | Dispositivos |
|---|---|---|
| quarto_maria | presença, iluminância, abertura_porta | lâmpada, cortina, difusor |
| quarto_pedro_maria | presença, iluminância | lâmpada, cortina, AC |
| quarto_lucas | presença, iluminância, abertura_porta | lâmpada, cortina |
| sala | presença, decibel, iluminância | lâmpada, cortina, alto_falante |
| cozinha | presença, fluxo_agua, consumo_energia | lâmpada, alto_falante |
| banheiro | fluxo_agua, presença | lâmpada, aquecedor |
| escritorio | presença, iluminância | lâmpada, AC |

### 5.3 Geração de Leituras

- **Tick base:** 1 leitura/sensor/minuto (em tempo simulado).
- **Velocidade configurável:** `--velocidade 1x` (tempo real) até `1440x` (1 dia = 1 minuto).
- **Cada sensor é classe** com método `gerar(momento, moradores_presentes, cenario)`.
- **Sensor de presença** retorna 0/1; demais retornam float na unidade especificada.
- **Ruído gaussiano** aplicado a todas leituras numéricas.

### 5.4 Cenários

CLI: `python -m simulador.simulador --cenario {normal|luto|insonia|celebracao} --dias 30 --velocidade 1440`

| Cenário | Comportamento |
|---|---|
| `normal` | 30 dias de baseline puro. |
| `luto` | Dias 1-14 normais. A partir do dia 15, Maria: imobilidade noturna na sala, cozinha sem uso (12h+), quarto fechado, banho deslocado. |
| `insonia` | Dias 1-10 normais. A partir do dia 11, Lucas: sono fragmentado, perambulação 2h-5h, luz do quarto acesa fora do horário. |
| `celebracao` | Dia 20 com pico social: múltiplos moradores presentes, decibéis altos na sala, cozinha intensa. |

### 5.5 Motor Hemera Reagindo

Em paralelo ao simulador, o motor:
1. A cada 5 min simulados, calcula padrão da última hora vs baseline.
2. Se desvio > 2σ em métrica relevante, registra `desvios_detectados`.
3. Resolve cena candidata via pesos de aprendizado + filtros (não bloqueada, dispositivos disponíveis).
4. Executa: `INSERT intervencoes` + `INSERT acionamentos`.
5. Aguarda 10 min simulados; se padrão voltar ao baseline, registra reação `aceite_implicito`; se morador "cancelar" (lógica do simulador), registra `cancelada`.
6. Ajusta peso da cena para o morador.

---

## 6. AS 12 QUERIES DQL (NÚCLEO DA AVALIAÇÃO)

Devem viver em `db/queries.sql` numeradas e comentadas. Cada uma também é endpoint REST em `/api/consultas/q{N}`.

| # | Requisito | Pergunta de Negócio |
|---|---|---|
| Q01 | WHERE + AND/OR/NOT | Desvios detectados nos últimos 7 dias em cômodos com sensor de presença E iluminância. |
| Q02 | INNER JOIN | Lista intervenções com nome do morador, nome da cena, cômodo e timestamp. |
| Q03 | LEFT OUTER JOIN | Cômodos sem nenhum sensor cadastrado (gap de cobertura). |
| Q04 | RIGHT OUTER JOIN | Sensores cadastrados que nunca geraram leitura (simular via LEFT invertido — SQLite não tem RIGHT nativo; use `LEFT` com tabelas trocadas e documente). |
| Q05 | FULL OUTER JOIN | Reconciliação cenas × tipos_dispositivo: cenas sem dispositivo e dispositivos sem cena. (SQLite: usar `UNION` de dois LEFT JOINs.) |
| Q06 | GROUP BY | Total de intervenções por cômodo no último mês. |
| Q07 | HAVING | Cenas com taxa de aceite_implicito > 60% (candidatas a promover). |
| Q08 | ORDER BY (ASC + DESC) | Sensores ordenados por volume de leituras (DESC) e secundariamente por nome (ASC). |
| Q09 | SUM/AVG/COUNT/MIN/MAX | Estatísticas de duração entre desvio e intervenção: total, média, mínima, máxima, contagem. |
| Q10 | Funções de string | Relatório formatado: `CONCAT(UPPER(morador), ' — ', LOWER(comodo), ' [', LENGTH(cena), ' chars]')` para últimas 20 intervenções. |
| Q11 | Funções de data | Intervenções agrupadas por dia da semana e hora do dia (`strftime`); intervalo médio entre desvios consecutivos do mesmo morador. |
| Q12 | UNION | Linha do tempo unificada: leituras significativas (presença=1) + intervenções executadas + agendamentos previstos, ordenadas por timestamp. |

---

## 7. APLICAÇÃO — FUNCIONALIDADES

### 7.1 Endpoints REST (FastAPI)

```
GET  /                         → serve index.html
GET  /api/residencias          → lista residências
GET  /api/moradores            → lista moradores
GET  /api/comodos              → lista cômodos com sensores e dispositivos
GET  /api/leituras/recentes    → últimas N leituras (paginado)
POST /api/leituras             → inserir leitura (usado pelo simulador)
GET  /api/desvios              → desvios detectados
GET  /api/intervencoes         → intervenções com status
POST /api/intervencoes/{id}/cancelar → registra reação "cancelada"
GET  /api/consultas/q{1..12}   → executa a query DQL N e retorna JSON
WS   /ws                       → push de eventos em tempo real
```

### 7.2 Painel Web

Página única (`index.html`) com 4 áreas:
1. **Planta SVG** da casa com sensores (pontos) e dispositivos (ícones); pisca ao receber evento via WebSocket.
2. **Timeline** lateral mostrando eventos em ordem reversa (leituras significativas, desvios, intervenções).
3. **Seletor de Query** com botões Q01–Q12; clica → busca `/api/consultas/qN` → renderiza tabela.
4. **Painel de Controle** com status do simulador (cenário atual, dia simulado, velocidade).

### 7.3 Comunicação Simulador ↔ Hemera

Simulador roda como processo independente e **escreve direto no banco** (mesmo arquivo SQLite). FastAPI lê do banco e publica via WebSocket. Não há acoplamento de processo — desacoplamento por banco.

---

## 8. FASES DE EXECUÇÃO

### FASE 1 — Setup do Projeto
- Criar estrutura de diretórios conforme seção 3.
- Criar `requirements.txt` com pacotes da seção 2.
- Criar `README.md` com instruções de execução.
- Criar `.gitignore` (ignorar `*.db`, `__pycache__`, `.venv`).
- **Critério de aceite:** `pip install -r requirements.txt` executa sem erro.

### FASE 2 — DDL Completo
- Escrever `db/schema.sql` com todas as 22 tabelas da seção 4.2.
- Toda FK com `ON DELETE` explícito.
- Todos os CHECKs documentados em comentário SQL.
- Índices em colunas de busca frequente: `leituras.registrado_em`, `leituras.sensor_id`, `intervencoes.executada_em`.
- **Critério de aceite:** `sqlite3 hemera.db < db/schema.sql` cria o banco sem erro; `.schema` lista 22 tabelas.

### FASE 3 — DML de Catálogos
- Escrever `db/seed.sql` populando: 1 residência, 3 moradores, 7 cômodos, catálogos completos (tipos_sensor, tipos_dispositivo, acoes_dispositivo, protocolos), 23 sensores, 18 dispositivos, 8 cenas, ~30 linhas em `cena_dispositivo`.
- Criar `scripts/init_db.py` que apaga DB existente, executa `schema.sql`, executa `seed.sql`.
- **Critério de aceite:** `python scripts/init_db.py` produz banco populado; `SELECT COUNT(*) FROM sensores` retorna 23.

### FASE 4 — Simulador (Geração de Telemetria)
- Implementar `simulador/relogio.py` (tempo simulado acelerado).
- Implementar `simulador/moradores.py` (rotina probabilística por hora do dia).
- Implementar `simulador/sensores.py` (classes por tipo de sensor).
- Implementar `simulador/cenarios.py` (modificadores normal/luto/insonia/celebracao).
- Implementar `simulador/simulador.py` (CLI com argparse).
- Simulador escreve leituras em `leituras` diretamente.
- **Critério de aceite:** `python -m simulador.simulador --cenario normal --dias 30 --velocidade 1440` termina em ~30 segundos e popula tabela `leituras` com >40.000 linhas.

### FASE 5 — Motor Hemera (Detecção + Intervenção)
- Implementar `hemera/database.py` (conexão pool, helpers `execute`, `fetchall`).
- Implementar `hemera/baseline.py` (calcula baseline por morador×cômodo×métrica a partir de `leituras`).
- Implementar `hemera/motor.py` (loop que detecta desvio e dispara intervenção).
- Implementar `hemera/intervencoes.py` (executar cena = INSERT em intervencoes + acionamentos).
- Motor roda como task assíncrona dentro do FastAPI.
- **Critério de aceite:** ao rodar simulador com `--cenario luto`, após dias simulados 15+, tabela `intervencoes` recebe registros automaticamente.

### FASE 6 — API REST + Frontend
- Implementar todos os endpoints da seção 7.1.
- Implementar WebSocket em `hemera/routes/ws.py` que emite eventos a cada nova leitura/intervenção.
- Criar `hemera/static/planta.svg` com 7 cômodos desenhados, sensores como círculos, dispositivos como ícones.
- Criar `hemera/static/index.html` + `style.css` + `app.js`.
- App.js: conecta no WS, atualiza sensores/dispositivos visualmente, renderiza timeline.
- **Critério de aceite:** abrir `http://localhost:8000` mostra planta animada; rodar simulador em paralelo faz a planta "viver".

### FASE 7 — As 12 Queries DQL
- Escrever `db/queries.sql` com as 12 queries numeradas e comentadas (cada query precedida pelo número do requisito que cumpre).
- Implementar `hemera/routes/consultas.py` com 12 endpoints `/api/consultas/q1` a `/q12`.
- No frontend, botões Q01-Q12 que disparam fetch e renderizam tabela genérica.
- **Critério de aceite:** todas as 12 queries executam sem erro sobre banco populado; cada endpoint retorna JSON válido com >0 linhas (exceto Q03/Q04 que podem retornar vazio em banco coerente — documentar).

### FASE 8 — Script de Demo
- Criar `scripts/run_demo.sh` que: apaga banco, inicializa, inicia FastAPI em background, inicia simulador `--cenario luto --velocidade 1440 --dias 30`.
- Criar `scripts/reset.sh` para limpar estado.
- **Critério de aceite:** `bash scripts/run_demo.sh` em terminal limpo abre demo completa em <30 segundos.

### FASE 9 — README e Documentação
- README.md final com: descrição do produto, stack, como instalar, como rodar demo, screenshots, descrição das 12 queries, roteiro de apresentação para banca (seção 6 do brief).
- Adicionar modelo ER em ASCII art ou referência a diagrama.
- **Critério de aceite:** desenvolvedor desconhecido roda o projeto seguindo só o README, sem perguntar nada.

---

## 9. REGRAS DE QUALIDADE DE CÓDIGO

- **Sem ORM.** Todo SQL é literal, parametrizado com `?`.
- **Sem hardcode de paths.** Usar `pathlib.Path(__file__).parent`.
- **Funções com docstring.** Toda função pública documenta entrada/saída.
- **Type hints obrigatórios** em todas funções (`def f(x: int) -> str:`).
- **Commits sugeridos por fase** (mensagens descritivas no padrão `[fase-N] descrição`).
- **Logging com `logging`**, não `print`.
- **Configuração via constantes** em `hemera/config.py` (porta, caminho do banco, intervalo do motor).
- **Tratamento de erros**: try/except específicos, nunca `except:` mudo.

---

## 10. CRITÉRIOS DE SUCESSO FINAL

Ao final das 9 fases, executando `bash scripts/run_demo.sh` o avaliador deve:

1. Ver o servidor subir em `http://localhost:8000`.
2. Ver no painel: planta da casa, sensores ativando, dispositivos reagindo.
3. Ver na timeline: leituras significativas, desvios detectados, intervenções executadas, reações registradas.
4. Clicar em Q01–Q12 e ver cada consulta DQL executar e retornar resultado tabular.
5. Inspecionar `db/hemera.db` via `sqlite3` e validar schema + dados.
6. Ler `db/queries.sql` e ver as 12 consultas com comentário explicativo.

---

## 11. PRÓXIMA AÇÃO IMEDIATA

**Iniciar pela Fase 1.** Não pedir confirmação para iniciar — o brief autoriza execução sequencial completa. Reportar conclusão de cada fase com checklist do critério de aceite. Travar e perguntar **apenas** se encontrar ambiguidade técnica não coberta neste documento.
