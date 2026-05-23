"""Classes geradoras de leitura por tipo de sensor."""
import random
from datetime import datetime
from simulador.moradores import PerfilMorador


def _ruido(valor: float, sigma: float) -> float:
    return max(0.0, valor + random.gauss(0, sigma))


class SensorPresenca:
    tipo_codigo = "presenca"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        for m in moradores:
            prob = m.presenca_em(comodo, momento) * modificador
            if random.random() < prob:
                return 1.0
        return 0.0


class SensorFluxoAgua:
    tipo_codigo = "fluxo_agua"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        hora = momento.hour
        presentes = sum(1 for m in moradores
                        if random.random() < m.presenca_em(comodo, momento) * modificador)
        if comodo == "banheiro" and hora in (6, 7, 22, 23) and presentes:
            return _ruido(8.0 * modificador, 1.5)
        if comodo == "cozinha" and hora in (7, 12, 13, 18, 19, 20) and presentes:
            return _ruido(4.0 * modificador, 0.8)
        return 0.0


class SensorAbertura:
    tipo_codigo = "abertura_porta"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        # Porta aberta se alguém está no cômodo com probabilidade
        for m in moradores:
            if random.random() < m.presenca_em(comodo, momento) * modificador * 0.3:
                return 1.0
        return 0.0


class SensorDecibel:
    tipo_codigo = "decibel"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        presentes = sum(1 for m in moradores
                        if random.random() < m.presenca_em(comodo, momento) * modificador)
        base = 35.0 + presentes * 12.0
        return _ruido(base * modificador, 5.0)


class SensorIluminancia:
    tipo_codigo = "iluminancia"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        hora = momento.hour
        # Luz natural
        if 6 <= hora < 8:
            natural = (hora - 6) * 100
        elif 8 <= hora < 17:
            natural = 500 + random.gauss(0, 50)
        elif 17 <= hora < 19:
            natural = (19 - hora) * 150
        else:
            natural = 0.0
        # Luz artificial se alguém presente
        artificial = 0.0
        for m in moradores:
            if random.random() < m.presenca_em(comodo, momento) * modificador:
                artificial = 300.0
                break
        return max(0.0, natural + artificial + random.gauss(0, 20))


class SensorTemperatura:
    tipo_codigo = "temperatura"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        hora = momento.hour
        base = 20.0 + 3 * abs(hora - 14) / 14  # mínimo às 14h
        return _ruido(base, 0.5)


class SensorUmidade:
    tipo_codigo = "umidade"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        base = 55.0
        if comodo == "banheiro":
            hora = momento.hour
            for m in moradores:
                if hora in (6, 7, 22, 23) and random.random() < m.presenca_em(comodo, momento):
                    base = 85.0
                    break
        return _ruido(base, 3.0)


class SensorConsumoEnergia:
    tipo_codigo = "consumo_energia"

    def gerar(self, sensor_id: int, comodo: str, momento: datetime,
              moradores: list[PerfilMorador], modificador: float = 1.0) -> float:
        hora = momento.hour
        presentes = sum(1 for m in moradores
                        if random.random() < m.presenca_em(comodo, momento) * modificador)
        base = 0.1 + presentes * 0.3
        if comodo == "cozinha" and hora in (7, 12, 13, 18, 19, 20):
            base += 1.5
        return _ruido(base, 0.1)


SENSOR_CLASSES: dict[str, type] = {
    "presenca":        SensorPresenca,
    "fluxo_agua":      SensorFluxoAgua,
    "abertura_porta":  SensorAbertura,
    "decibel":         SensorDecibel,
    "iluminancia":     SensorIluminancia,
    "temperatura":     SensorTemperatura,
    "umidade":         SensorUmidade,
    "consumo_energia": SensorConsumoEnergia,
}
