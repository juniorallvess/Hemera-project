-- Layout da planta: posição dos sensores e metadados da simulação
ALTER TABLE sensores ADD COLUMN pos_x REAL;
ALTER TABLE sensores ADD COLUMN pos_y REAL;

CREATE TABLE IF NOT EXISTS config_planta (
    chave   TEXT PRIMARY KEY,
    valor   TEXT NOT NULL
);

INSERT OR IGNORE INTO config_planta (chave, valor) VALUES ('fonte', 'padrao');
