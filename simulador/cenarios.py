"""Modificadores de comportamento por cenário."""
from datetime import datetime


class CenarioBase:
    nome: str = "base"

    def modificador_presenca(self, morador_id: int, comodo: str,
                             momento: datetime, dia_simulado: int) -> float:
        """Retorna multiplicador sobre probabilidade de presença (1.0 = normal)."""
        return 1.0

    def modificador_fluxo(self, morador_id: int, comodo: str,
                          momento: datetime, dia_simulado: int) -> float:
        return 1.0

    def modificador_decibel(self, morador_id: int, comodo: str,
                            momento: datetime, dia_simulado: int) -> float:
        return 1.0


class CenarioNormal(CenarioBase):
    nome = "normal"


class CenarioLuto(CenarioBase):
    """A partir do dia 15: Maria exibe imobilidade noturna na sala,
    cozinha sem uso prolongado, quarto fechado, banho deslocado."""
    nome = "luto"
    MORADOR_ID = 1  # Maria

    def modificador_presenca(self, morador_id: int, comodo: str,
                             momento: datetime, dia_simulado: int) -> float:
        if morador_id != self.MORADOR_ID or dia_simulado < 15:
            return 1.0
        hora = momento.hour
        if comodo == "sala" and 21 <= hora <= 23:
            return 2.5   # imobilidade noturna na sala
        if comodo == "cozinha":
            return 0.05  # cozinha praticamente sem uso
        if comodo in ("quarto_maria", "quarto_pedro_maria") and 8 <= hora <= 20:
            return 1.8   # quarto mais fechado durante o dia
        if comodo == "banheiro" and hora in (6, 7):
            return 0.1   # banho deslocado do horário habitual
        if comodo == "banheiro" and hora in (14, 15):
            return 1.5   # banho em horário incomum
        return 1.0

    def modificador_fluxo(self, morador_id: int, comodo: str,
                          momento: datetime, dia_simulado: int) -> float:
        if morador_id != self.MORADOR_ID or dia_simulado < 15:
            return 1.0
        if comodo == "cozinha":
            return 0.05
        return 1.0


class CenarioInsonia(CenarioBase):
    """A partir do dia 11: Lucas com sono fragmentado, perambulação 2h-5h."""
    nome = "insonia"
    MORADOR_ID = 3  # Lucas

    def modificador_presenca(self, morador_id: int, comodo: str,
                             momento: datetime, dia_simulado: int) -> float:
        if morador_id != self.MORADOR_ID or dia_simulado < 11:
            return 1.0
        hora = momento.hour
        if comodo == "quarto_lucas" and 0 <= hora <= 5:
            return 0.3   # dificuldade para dormir
        if comodo in ("sala", "cozinha") and 2 <= hora <= 5:
            return 3.0   # perambulação noturna
        return 1.0


class CenarioCelebracao(CenarioBase):
    """Dia 20: pico social com múltiplos moradores na sala."""
    nome = "celebracao"

    def modificador_presenca(self, morador_id: int, comodo: str,
                             momento: datetime, dia_simulado: int) -> float:
        if dia_simulado != 20:
            return 1.0
        hora = momento.hour
        if comodo == "sala" and 17 <= hora <= 23:
            return 2.0
        if comodo == "cozinha" and 16 <= hora <= 22:
            return 1.8
        return 1.0

    def modificador_decibel(self, morador_id: int, comodo: str,
                            momento: datetime, dia_simulado: int) -> float:
        if dia_simulado != 20:
            return 1.0
        hora = momento.hour
        if comodo == "sala" and 17 <= hora <= 23:
            return 2.5
        return 1.0


CENARIOS: dict[str, type[CenarioBase]] = {
    "normal":     CenarioNormal,
    "luto":       CenarioLuto,
    "insonia":    CenarioInsonia,
    "celebracao": CenarioCelebracao,
}
