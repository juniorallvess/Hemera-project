"""Mapeamento cômodo/tipo → id SVG e posições padrão da planta."""
from hemera.database import execute, fetchall, fetchone

PREFIXOS: dict[str, str] = {
    "quarto_maria": "qm",
    "quarto_pedro_maria": "qpm",
    "quarto_lucas": "ql",
    "sala": "sala",
    "cozinha": "coz",
    "banheiro": "ban",
    "escritorio": "esc",
}

# sensor_id → (pos_x, pos_y) alinhado a hemera/static/planta.svg
POSICOES_PADRAO: dict[int, tuple[float, float]] = {
    1: (60, 98),
    2: (90, 98),
    3: (120, 98),
    4: (250, 98),
    5: (280, 98),
    6: (310, 98),
    7: (440, 98),
    8: (466, 98),
    9: (492, 98),
    10: (518, 98),
    11: (630, 98),
    12: (660, 98),
    13: (690, 98),
    14: (80, 252),
    15: (115, 252),
    16: (150, 252),
    17: (185, 252),
    18: (340, 252),
    19: (375, 252),
    20: (410, 252),
    21: (565, 252),
    22: (600, 252),
    23: (635, 252),
}

CENTROS_COMODO: dict[str, tuple[float, float]] = {
    "quarto_maria": (115, 108),
    "quarto_pedro_maria": (305, 108),
    "quarto_lucas": (490, 108),
    "escritorio": (680, 108),
    "sala": (155, 270),
    "cozinha": (397, 270),
    "banheiro": (642, 270),
}


def tipo_para_sufixo(codigo: str) -> str:
    return codigo.replace("_", "")


def svg_id_sensor(comodo_nome: str, tipo_codigo: str) -> str:
    pref = PREFIXOS.get(comodo_nome, "x")
    return f"s_{pref}_{tipo_para_sufixo(tipo_codigo)}"


def _coluna_existe(tabela: str, coluna: str) -> bool:
    rows = fetchall(f"PRAGMA table_info({tabela})")
    return any(r["name"] == coluna for r in rows)


def aplicar_migracao_layout() -> None:
    """Idempotente: adiciona colunas e preenche posições padrão."""
    row = fetchone("SELECT 1 FROM sqlite_master WHERE type='table' AND name='config_planta'")
    if not row:
        from pathlib import Path
        sql = (Path(__file__).parent.parent / "db" / "migrations" / "001_layout.sql").read_text()
        with __import__("hemera.database", fromlist=["get_connection"]).get_connection() as conn:
            for stmt in sql.split(";"):
                s = stmt.strip()
                if s:
                    try:
                        conn.execute(s)
                    except Exception:
                        pass

    # pos_x/pos_y em dispositivos (segunda migração)
    if not _coluna_existe("dispositivos", "pos_x"):
        execute("ALTER TABLE dispositivos ADD COLUMN pos_x REAL")
    if not _coluna_existe("dispositivos", "pos_y"):
        execute("ALTER TABLE dispositivos ADD COLUMN pos_y REAL")

    # geladeira nos tipos_dispositivo
    existing = fetchone("SELECT 1 FROM tipos_dispositivo WHERE codigo='geladeira'")
    if not existing:
        execute("INSERT OR IGNORE INTO tipos_dispositivo (codigo, descricao) VALUES ('geladeira', 'Geladeira inteligente')")

    for sid, (x, y) in POSICOES_PADRAO.items():
        execute(
            "UPDATE sensores SET pos_x=?, pos_y=? WHERE id=? AND (pos_x IS NULL OR pos_y IS NULL)",
            (x, y, sid),
        )


def listar_sensores_layout() -> list[dict]:
    rows = fetchall("""
        SELECT s.id, s.comodo_id, s.pos_x, s.pos_y,
               c.nome AS comodo, ts.codigo AS tipo, ts.descricao AS tipo_descricao
        FROM sensores s
        JOIN comodos c ON s.comodo_id = c.id
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE s.ativo = 1
        ORDER BY s.id
    """)
    for r in rows:
        r["kind"] = "sensor"
        r["svg_id"] = svg_id_sensor(r["comodo"], r["tipo"])
        if r["pos_x"] is None or r["pos_y"] is None:
            px, py = POSICOES_PADRAO.get(r["id"], (100, 100))
            r["pos_x"], r["pos_y"] = px, py
    return rows


def listar_dispositivos_layout() -> list[dict]:
    rows = fetchall("""
        SELECT d.id, d.comodo_id, d.pos_x, d.pos_y,
               c.nome AS comodo, td.codigo AS tipo, td.descricao AS tipo_descricao
        FROM dispositivos d
        JOIN comodos c ON d.comodo_id = c.id
        JOIN tipos_dispositivo td ON d.tipo_dispositivo_id = td.id
        WHERE d.ativo = 1
        ORDER BY d.id
    """)
    for r in rows:
        r["kind"] = "dispositivo"
        r["svg_id"] = None
    return rows
