"""SQLite connection helpers for Hemera."""
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

from hemera.config import DB_PATH

# Conexão reusável por thread (opt-in via usar_conexao_unica).
_conn_local = threading.local()


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    """Context manager: yields connection with FK enforcement, WAL mode."""
    existente = getattr(_conn_local, "conn", None)
    if existente is not None:
        yield existente          # reuse; owner (usar_conexao_unica) commits/closes
        return
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@contextmanager
def usar_conexao_unica() -> Generator[sqlite3.Connection, None, None]:
    """Reusa UMA conexão no escopo (acelera laços com muitas queries, ex.: replay).
    Não usar concorrentemente com o loop assíncrono do app."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    _conn_local.conn = conn
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _conn_local.conn = None
        conn.close()


def execute(sql: str, params: tuple = ()) -> None:
    """Execute a DML statement."""
    with get_connection() as conn:
        conn.execute(sql, params)


def fetchall(sql: str, params: tuple = ()) -> list[dict]:
    """Execute SELECT, return list of dicts."""
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


def fetchone(sql: str, params: tuple = ()) -> dict | None:
    """Execute SELECT, return single dict or None."""
    with get_connection() as conn:
        row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None
