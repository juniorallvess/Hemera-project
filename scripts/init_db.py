"""Initialize Hemera database: drop if exists, create schema, seed data."""
import logging
import sqlite3
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
DB_PATH       = BASE_DIR / "db" / "hemera.db"
SCHEMA        = BASE_DIR / "db" / "schema.sql"
SEED          = BASE_DIR / "db" / "seed.sql"
FIX_DEMO_DATA = BASE_DIR / "db" / "fix_demo_data.sql"


def init_db() -> None:
    """Drop existing DB, apply schema, seed and fix_demo_data."""
    if DB_PATH.exists():
        DB_PATH.unlink()
        log.info("Banco anterior removido.")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    log.info("Aplicando schema.sql …")
    conn.executescript(SCHEMA.read_text(encoding='utf-8'))

    log.info("Aplicando seed.sql …")
    conn.executescript(SEED.read_text(encoding='utf-8'))

    log.info("Aplicando fix_demo_data.sql …")
    conn.executescript(FIX_DEMO_DATA.read_text(encoding='utf-8'))

    mig = BASE_DIR / "db" / "migrations" / "001_layout.sql"
    if mig.exists():
        log.info("Aplicando migrations/001_layout.sql …")
        for stmt in mig.read_text(encoding='utf-8').split(";"):
            s = stmt.strip()
            if s:
                try:
                    conn.execute(s)
                except Exception:
                    pass

    conn.commit()

    counts = {
        "sensores":     conn.execute("SELECT COUNT(*) FROM sensores").fetchone()[0],
        "dispositivos": conn.execute("SELECT COUNT(*) FROM dispositivos").fetchone()[0],
        "cenas":        conn.execute("SELECT COUNT(*) FROM cenas").fetchone()[0],
        "moradores":    conn.execute("SELECT COUNT(*) FROM moradores").fetchone()[0],
        "comodos":      conn.execute("SELECT COUNT(*) FROM comodos").fetchone()[0],
    }
    conn.close()

    for table, n in counts.items():
        log.info("  %-15s %d linhas", table, n)

    # 23 do seed + 1 do fix_demo_data (sensor ignorado para Q04)
    assert counts["sensores"] == 24, f"Esperado 24 sensores, obtido {counts['sensores']}"
    # 7 do seed + 1 lavanderia do fix_demo_data (para Q03)
    assert counts["comodos"] == 8, f"Esperado 8 cômodos, obtido {counts['comodos']}"
    log.info("Banco inicializado em %s", DB_PATH)


if __name__ == "__main__":
    init_db()
