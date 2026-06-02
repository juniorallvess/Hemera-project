-- Migração 002: geometria espacial dos cômodos (polígonos desenhados sobre o SVG).
-- Coordenadas em JSON [[x,y],...] no espaço do viewBox 0 0 800 520.
CREATE TABLE IF NOT EXISTS comodo_geometria (
    comodo_id     INTEGER PRIMARY KEY,
    poligono      TEXT NOT NULL,
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (comodo_id) REFERENCES comodos(id) ON DELETE CASCADE
);
