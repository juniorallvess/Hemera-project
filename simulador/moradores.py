"""Perfis de moradores e probabilidade de presença por cômodo/hora."""
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class PerfilMorador:
    morador_id: int
    nome: str
    perfil: str
    # presenca[comodo_nome][hora_do_dia] = probabilidade 0..1
    presenca: dict[str, list[float]] = field(default_factory=dict)

    def presenca_em(self, comodo: str, momento: datetime) -> float:
        """Retorna probabilidade de presença no cômodo no instante dado."""
        hora = momento.hour
        tabela = self.presenca.get(comodo, [0.0] * 24)
        return tabela[hora]


def _zeros() -> list[float]:
    return [0.0] * 24


def _horas(pairs: list[tuple[int, int, float]]) -> list[float]:
    """Constrói lista 24h a partir de (hora_ini, hora_fim_excl, prob)."""
    base = _zeros()
    for ini, fim, p in pairs:
        for h in range(ini, fim):
            base[h] = p
    return base


def criar_moradores() -> list[PerfilMorador]:
    """Cria os 3 moradores da família simulada."""

    # Maria (adulto_pleno): sai 7h30 / volta 18h / dorme 23h
    maria = PerfilMorador(
        morador_id=1, nome="Maria Silva", perfil="adulto_pleno",
        presenca={
            "quarto_maria":       _horas([(0,7,0.9),(7,8,0.3),(18,23,0.4),(23,24,0.9)]),
            "quarto_pedro_maria": _horas([(0,7,0.9),(23,24,0.9)]),
            "quarto_lucas":       _horas([(8,22,0.1)]),
            "sala":               _horas([(6,8,0.4),(18,23,0.6)]),
            "cozinha":            _horas([(6,8,0.7),(12,13,0.3),(18,20,0.8)]),
            "banheiro":           _horas([(6,7,0.9),(22,23,0.8)]),
            "escritorio":         _horas([(8,10,0.2)]),
        }
    )

    # Pedro (home_office): café 7h / escritório 8-18h / jantar 20h / dorme 23h30
    pedro = PerfilMorador(
        morador_id=2, nome="Pedro Silva", perfil="home_office",
        presenca={
            "quarto_pedro_maria": _horas([(0,7,0.9),(23,24,0.9)]),
            "quarto_maria":       _horas([(0,7,0.8),(23,24,0.8)]),
            "quarto_lucas":       _horas([(9,11,0.1)]),
            "sala":               _horas([(7,8,0.3),(12,13,0.5),(20,23,0.6)]),
            "cozinha":            _horas([(7,8,0.7),(12,13,0.7),(19,21,0.6)]),
            "banheiro":           _horas([(7,8,0.8),(23,24,0.5)]),
            "escritorio":         _horas([(8,18,0.9),(18,20,0.5)]),
        }
    )

    # Lucas (jovem_adulto): acorda 9h / fora 13-19h / sono irregular
    lucas = PerfilMorador(
        morador_id=3, nome="Lucas Silva", perfil="jovem_adulto",
        presenca={
            "quarto_lucas":       _horas([(0,9,0.9),(19,24,0.6)]),
            "quarto_maria":       _horas([(10,13,0.1)]),
            "quarto_pedro_maria": _zeros(),
            "sala":               _horas([(9,13,0.5),(19,24,0.4)]),
            "cozinha":            _horas([(9,10,0.7),(19,20,0.6)]),
            "banheiro":           _horas([(9,10,0.8),(22,23,0.6)]),
            "escritorio":         _zeros(),
        }
    )

    return [maria, pedro, lucas]
