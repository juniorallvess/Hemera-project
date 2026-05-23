"""Upload e layout da planta SVG."""
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from hemera.config import BASE_DIR
from hemera.database import execute, fetchall, fetchone
from hemera.planta_layout import (
    aplicar_migracao_layout,
    listar_dispositivos_layout,
    listar_sensores_layout,
)

router = APIRouter()

PLANTA_PATH = Path(__file__).parent.parent / "static" / "planta.svg"
PLANTA_PUBLIC = BASE_DIR / "frontend" / "public" / "static" / "planta.svg"


class Posicao(BaseModel):
    pos_x: float
    pos_y: float


class NovoSensor(BaseModel):
    tipo_sensor_id: int
    comodo_id: int
    pos_x: float
    pos_y: float
    fabricante: str = "Manual"
    protocolo_id: int = 1


class NovoDispositivo(BaseModel):
    tipo_dispositivo_id: int
    comodo_id: int
    pos_x: float
    pos_y: float
    fabricante: str = "Manual"
    protocolo_id: int = 1


@router.get("/api/planta/info")
def info_planta() -> dict:
    aplicar_migracao_layout()
    row = fetchone("SELECT valor FROM config_planta WHERE chave='fonte'")
    return {
        "fonte": row["valor"] if row else "padrao",
        "existe": PLANTA_PATH.is_file(),
    }


@router.get("/api/tipos")
def listar_tipos() -> dict:
    aplicar_migracao_layout()
    sensores = fetchall("SELECT id, codigo, descricao, unidade_medida FROM tipos_sensor ORDER BY id")
    dispositivos = fetchall("SELECT id, codigo, descricao FROM tipos_dispositivo ORDER BY id")
    return {"sensores": sensores, "dispositivos": dispositivos}


@router.get("/api/comodos")
def listar_comodos() -> list[dict]:
    return fetchall("SELECT id, nome, tipo, area_m2 FROM comodos ORDER BY id")


@router.get("/api/sensores/layout")
def layout_sensores() -> list[dict]:
    aplicar_migracao_layout()
    return listar_sensores_layout()


@router.get("/api/dispositivos/layout")
def layout_dispositivos() -> list[dict]:
    aplicar_migracao_layout()
    return listar_dispositivos_layout()


@router.patch("/api/sensores/{sensor_id}/posicao")
def atualizar_posicao_sensor(sensor_id: int, body: Posicao) -> dict:
    row = fetchone("SELECT id FROM sensores WHERE id=?", (sensor_id,))
    if not row:
        raise HTTPException(404, "Sensor não encontrado")
    execute(
        "UPDATE sensores SET pos_x=?, pos_y=? WHERE id=?",
        (body.pos_x, body.pos_y, sensor_id),
    )
    return {"ok": True, "id": sensor_id, "pos_x": body.pos_x, "pos_y": body.pos_y}


@router.patch("/api/dispositivos/{disp_id}/posicao")
def atualizar_posicao_dispositivo(disp_id: int, body: Posicao) -> dict:
    row = fetchone("SELECT id FROM dispositivos WHERE id=?", (disp_id,))
    if not row:
        raise HTTPException(404, "Dispositivo não encontrado")
    execute(
        "UPDATE dispositivos SET pos_x=?, pos_y=? WHERE id=?",
        (body.pos_x, body.pos_y, disp_id),
    )
    return {"ok": True, "id": disp_id, "pos_x": body.pos_x, "pos_y": body.pos_y}


@router.post("/api/sensores")
def criar_sensor(body: NovoSensor) -> dict:
    aplicar_migracao_layout()
    comodo = fetchone("SELECT id FROM comodos WHERE id=?", (body.comodo_id,))
    if not comodo:
        raise HTTPException(404, "Cômodo não encontrado")
    tipo = fetchone("SELECT id FROM tipos_sensor WHERE id=?", (body.tipo_sensor_id,))
    if not tipo:
        raise HTTPException(404, "Tipo de sensor não encontrado")
    with __import__("hemera.database", fromlist=["get_connection"]).get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO sensores (comodo_id, tipo_sensor_id, protocolo_id, fabricante, ativo, pos_x, pos_y) "
            "VALUES (?, ?, ?, ?, 1, ?, ?)",
            (body.comodo_id, body.tipo_sensor_id, body.protocolo_id, body.fabricante, body.pos_x, body.pos_y),
        )
        new_id = cur.lastrowid
    row = fetchone("""
        SELECT s.id, s.comodo_id, s.pos_x, s.pos_y,
               c.nome AS comodo, ts.codigo AS tipo, ts.descricao AS tipo_descricao
        FROM sensores s
        JOIN comodos c ON s.comodo_id = c.id
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE s.id=?
    """, (new_id,))
    row["kind"] = "sensor"
    from hemera.planta_layout import svg_id_sensor
    row["svg_id"] = svg_id_sensor(row["comodo"], row["tipo"])
    return row


@router.post("/api/dispositivos")
def criar_dispositivo(body: NovoDispositivo) -> dict:
    aplicar_migracao_layout()
    comodo = fetchone("SELECT id FROM comodos WHERE id=?", (body.comodo_id,))
    if not comodo:
        raise HTTPException(404, "Cômodo não encontrado")
    tipo = fetchone("SELECT id FROM tipos_dispositivo WHERE id=?", (body.tipo_dispositivo_id,))
    if not tipo:
        raise HTTPException(404, "Tipo de dispositivo não encontrado")
    with __import__("hemera.database", fromlist=["get_connection"]).get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO dispositivos (comodo_id, tipo_dispositivo_id, protocolo_id, fabricante, ativo, pos_x, pos_y) "
            "VALUES (?, ?, ?, ?, 1, ?, ?)",
            (body.comodo_id, body.tipo_dispositivo_id, body.protocolo_id, body.fabricante, body.pos_x, body.pos_y),
        )
        new_id = cur.lastrowid
    row = fetchone("""
        SELECT d.id, d.comodo_id, d.pos_x, d.pos_y,
               c.nome AS comodo, td.codigo AS tipo, td.descricao AS tipo_descricao
        FROM dispositivos d
        JOIN comodos c ON d.comodo_id = c.id
        JOIN tipos_dispositivo td ON d.tipo_dispositivo_id = td.id
        WHERE d.id=?
    """, (new_id,))
    row["kind"] = "dispositivo"
    row["svg_id"] = None
    return row


@router.post("/api/planta/upload")
async def upload_planta(arquivo: UploadFile = File(...)) -> dict:
    if not arquivo.filename or not arquivo.filename.lower().endswith(".svg"):
        raise HTTPException(400, "Envie um ficheiro .svg")

    conteudo = await arquivo.read()
    texto = conteudo.decode("utf-8", errors="ignore")
    if "<svg" not in texto.lower():
        raise HTTPException(400, "Conteúdo SVG inválido")

    PLANTA_PATH.write_bytes(conteudo)
    if PLANTA_PUBLIC.parent.exists():
        PLANTA_PUBLIC.write_bytes(conteudo)

    execute(
        "INSERT INTO config_planta (chave, valor) VALUES ('fonte', 'personalizada') "
        "ON CONFLICT(chave) DO UPDATE SET valor='personalizada'"
    )
    return {"ok": True, "fonte": "personalizada"}
