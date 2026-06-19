"""Authentication routes for Hemera."""
import hashlib
from fastapi import APIRouter, HTTPException, Response, Request, Cookie
from pydantic import BaseModel

from hemera.database import fetchone, get_connection

router = APIRouter()


class AuthCredentials(BaseModel):
    username: str
    password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def criar_tabela_usuarios_se_nao_existe():
    """Cria a tabela de usuários se ela não existir."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                criado_em TEXT NOT NULL DEFAULT (DATETIME('now'))
            )
        """)


@router.post("/api/auth/register")
def register(credentials: AuthCredentials, response: Response) -> dict:
    username = credentials.username.strip()
    password = credentials.password

    if not username:
        raise HTTPException(status_code=400, detail="Usuário não pode ser vazio.")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 4 caracteres.")

    criar_tabela_usuarios_se_nao_existe()

    # Verifica se já existe
    usuario_existente = fetchone("SELECT id FROM usuarios WHERE username = ?", (username,))
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Nome de usuário já está em uso.")

    pw_hash = hash_password(password)

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO usuarios (username, password_hash) VALUES (?, ?)",
            (username, pw_hash)
        )

    # Autentica imediatamente definindo o cookie de sessão
    response.set_cookie(
        key="session",
        value=username,
        httponly=True,
        max_age=86400,  # 1 dia
        samesite="lax",
        path="/"
    )
    return {"success": True, "username": username}


@router.post("/api/auth/login")
def login(credentials: AuthCredentials, response: Response) -> dict:
    username = credentials.username.strip()
    password = credentials.password

    criar_tabela_usuarios_se_nao_existe()

    usuario = fetchone("SELECT password_hash FROM usuarios WHERE username = ?", (username,))
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")

    pw_hash = hash_password(password)
    if usuario["password_hash"] != pw_hash:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")

    # Define o cookie de sessão
    response.set_cookie(
        key="session",
        value=username,
        httponly=True,
        max_age=86400,  # 1 dia
        samesite="lax",
        path="/"
    )
    return {"success": True, "username": username}


@router.get("/api/auth/session")
def get_session(session: str | None = Cookie(default=None)) -> dict:
    criar_tabela_usuarios_se_nao_existe()
    if not session:
        return {"logged_in": False}
    
    # Verifica se usuário existe no banco
    usuario = fetchone("SELECT username FROM usuarios WHERE username = ?", (session,))
    if not usuario:
        return {"logged_in": False}
        
    return {"logged_in": True, "username": session}


@router.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(key="session", path="/")
    return {"logged_in": False}
