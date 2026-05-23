"""Relógio simulado com tempo acelerado."""
from datetime import datetime, timedelta


class RelogioSimulado:
    """Gerencia tempo simulado com aceleração configurável."""

    def __init__(self, inicio: datetime, velocidade: int = 1) -> None:
        self.data_atual: datetime = inicio
        self.velocidade: int = velocidade
        # 1 tick = 1 minuto simulado
        self._tick_real: float = 60.0 / velocidade

    def tick(self) -> datetime:
        """Avança 1 minuto simulado e retorna novo instante."""
        self.data_atual += timedelta(minutes=1)
        return self.data_atual

    @property
    def tick_real_segundos(self) -> float:
        """Segundos reais que cada tick deve durar para manter velocidade."""
        return self._tick_real
