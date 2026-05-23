PRAGMA foreign_keys = ON;

-- =============================================================
-- CATÁLOGOS
-- =============================================================

CREATE TABLE IF NOT EXISTS residencias (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT    NOT NULL,
    endereco        TEXT    NOT NULL,
    data_instalacao TEXT    NOT NULL DEFAULT (DATE('now'))
);

CREATE TABLE IF NOT EXISTS moradores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    residencia_id   INTEGER NOT NULL REFERENCES residencias(id) ON DELETE RESTRICT,
    nome            TEXT    NOT NULL,
    data_nascimento TEXT    NOT NULL,
    -- CHECK: perfil ∈ {adulto_pleno, home_office, jovem_adulto, idoso, crianca}
    perfil          TEXT    NOT NULL CHECK (perfil IN ('adulto_pleno','home_office','jovem_adulto','idoso','crianca'))
);

CREATE TABLE IF NOT EXISTS comodos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    residencia_id   INTEGER NOT NULL REFERENCES residencias(id) ON DELETE CASCADE,
    nome            TEXT    NOT NULL,
    -- CHECK: tipo ∈ conjunto válido de ambientes
    tipo            TEXT    NOT NULL CHECK (tipo IN ('quarto','sala','cozinha','banheiro','escritorio','area_servico','garagem','varanda')),
    area_m2         REAL    NOT NULL CHECK (area_m2 > 0)
);

CREATE TABLE IF NOT EXISTS tipos_sensor (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          TEXT    NOT NULL UNIQUE,
    descricao       TEXT    NOT NULL,
    unidade_medida  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS tipos_dispositivo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          TEXT    NOT NULL UNIQUE,
    descricao       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS protocolos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          TEXT    NOT NULL UNIQUE,
    descricao       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS acoes_dispositivo (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo          TEXT    NOT NULL UNIQUE,
    descricao       TEXT    NOT NULL
);

-- =============================================================
-- INFRAESTRUTURA FÍSICA
-- =============================================================

CREATE TABLE IF NOT EXISTS sensores (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    comodo_id       INTEGER NOT NULL REFERENCES comodos(id) ON DELETE CASCADE,
    tipo_sensor_id  INTEGER NOT NULL REFERENCES tipos_sensor(id) ON DELETE RESTRICT,
    protocolo_id    INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE RESTRICT,
    fabricante      TEXT    NOT NULL,
    ativo           INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1))
);

CREATE TABLE IF NOT EXISTS dispositivos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    comodo_id           INTEGER NOT NULL REFERENCES comodos(id) ON DELETE CASCADE,
    tipo_dispositivo_id INTEGER NOT NULL REFERENCES tipos_dispositivo(id) ON DELETE RESTRICT,
    protocolo_id        INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE RESTRICT,
    fabricante          TEXT    NOT NULL,
    ativo               INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1))
);

-- =============================================================
-- TELEMETRIA
-- =============================================================

CREATE TABLE IF NOT EXISTS leituras (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id       INTEGER NOT NULL REFERENCES sensores(id) ON DELETE CASCADE,
    valor           REAL    NOT NULL,
    registrado_em   TEXT    NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_leituras_registrado_em ON leituras(registrado_em);
CREATE INDEX IF NOT EXISTS idx_leituras_sensor_id     ON leituras(sensor_id);

-- =============================================================
-- PADRÕES COMPORTAMENTAIS E BASELINE
-- =============================================================

CREATE TABLE IF NOT EXISTS padroes_comportamentais (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    janela_inicio   TEXT    NOT NULL,
    janela_fim      TEXT    NOT NULL,
    comodo_id       INTEGER NOT NULL REFERENCES comodos(id) ON DELETE CASCADE,
    metrica         TEXT    NOT NULL,
    valor           REAL    NOT NULL
);

CREATE TABLE IF NOT EXISTS baselines (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    comodo_id       INTEGER NOT NULL REFERENCES comodos(id) ON DELETE CASCADE,
    metrica         TEXT    NOT NULL,
    valor_medio     REAL    NOT NULL,
    desvio_padrao   REAL    NOT NULL DEFAULT 0,
    calculado_em    TEXT    NOT NULL DEFAULT (DATETIME('now'))
);

-- =============================================================
-- DETECÇÃO DE DESVIOS
-- =============================================================

CREATE TABLE IF NOT EXISTS desvios_detectados (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    comodo_id       INTEGER NOT NULL REFERENCES comodos(id) ON DELETE CASCADE,
    baseline_id     INTEGER NOT NULL REFERENCES baselines(id) ON DELETE RESTRICT,
    intensidade     REAL    NOT NULL CHECK (intensidade >= 0),
    detectado_em    TEXT    NOT NULL DEFAULT (DATETIME('now'))
);

-- =============================================================
-- CENAS
-- =============================================================

CREATE TABLE IF NOT EXISTS cenas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT    NOT NULL UNIQUE,
    descricao       TEXT    NOT NULL,
    ativa           INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0,1))
);

CREATE TABLE IF NOT EXISTS cena_dispositivo (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    cena_id             INTEGER NOT NULL REFERENCES cenas(id) ON DELETE CASCADE,
    tipo_dispositivo_id INTEGER NOT NULL REFERENCES tipos_dispositivo(id) ON DELETE RESTRICT,
    acao_id             INTEGER NOT NULL REFERENCES acoes_dispositivo(id) ON DELETE RESTRICT,
    intensidade         REAL    NOT NULL DEFAULT 1.0 CHECK (intensidade >= 0 AND intensidade <= 1),
    duracao_segundos    INTEGER NOT NULL DEFAULT 3600 CHECK (duracao_segundos > 0)
);

-- =============================================================
-- INTERVENÇÕES E ACIONAMENTOS
-- =============================================================

CREATE TABLE IF NOT EXISTS intervencoes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    desvio_id       INTEGER NOT NULL REFERENCES desvios_detectados(id) ON DELETE CASCADE,
    cena_id         INTEGER NOT NULL REFERENCES cenas(id) ON DELETE RESTRICT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    comodo_id       INTEGER NOT NULL REFERENCES comodos(id) ON DELETE CASCADE,
    executada_em    TEXT    NOT NULL DEFAULT (DATETIME('now')),
    -- CHECK: status ∈ {executada, cancelada, expirada}
    status          TEXT    NOT NULL DEFAULT 'executada' CHECK (status IN ('executada','cancelada','expirada'))
);

CREATE INDEX IF NOT EXISTS idx_intervencoes_executada_em ON intervencoes(executada_em);

CREATE TABLE IF NOT EXISTS acionamentos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    intervencao_id  INTEGER NOT NULL REFERENCES intervencoes(id) ON DELETE CASCADE,
    dispositivo_id  INTEGER NOT NULL REFERENCES dispositivos(id) ON DELETE RESTRICT,
    acao_id         INTEGER NOT NULL REFERENCES acoes_dispositivo(id) ON DELETE RESTRICT,
    intensidade     REAL    NOT NULL DEFAULT 1.0 CHECK (intensidade >= 0 AND intensidade <= 1),
    acionado_em     TEXT    NOT NULL DEFAULT (DATETIME('now'))
);

CREATE TABLE IF NOT EXISTS reacoes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    intervencao_id  INTEGER NOT NULL REFERENCES intervencoes(id) ON DELETE CASCADE,
    -- CHECK: tipo_reacao ∈ {aceite_implicito, cancelada, ignorada}
    tipo_reacao     TEXT    NOT NULL CHECK (tipo_reacao IN ('aceite_implicito','cancelada','ignorada')),
    registrada_em   TEXT    NOT NULL DEFAULT (DATETIME('now'))
);

-- =============================================================
-- APRENDIZADO E PERSONALIZAÇÃO
-- =============================================================

CREATE TABLE IF NOT EXISTS aprendizado_pesos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    cena_id         INTEGER NOT NULL REFERENCES cenas(id) ON DELETE CASCADE,
    peso            REAL    NOT NULL DEFAULT 1.0 CHECK (peso >= 0),
    atualizado_em   TEXT    NOT NULL DEFAULT (DATETIME('now')),
    UNIQUE (morador_id, cena_id)
);

CREATE TABLE IF NOT EXISTS bloqueios_temporarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    cena_id         INTEGER NOT NULL REFERENCES cenas(id) ON DELETE CASCADE,
    ate             TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS agendamentos_sutis (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    morador_id      INTEGER NOT NULL REFERENCES moradores(id) ON DELETE CASCADE,
    cena_id         INTEGER NOT NULL REFERENCES cenas(id) ON DELETE CASCADE,
    -- 0=domingo, 1=segunda, ..., 6=sábado; NULL = todos os dias
    dia_semana      INTEGER CHECK (dia_semana IS NULL OR (dia_semana >= 0 AND dia_semana <= 6)),
    horario         TEXT    NOT NULL,
    ativo           INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0,1))
);
