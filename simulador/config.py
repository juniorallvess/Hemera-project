"""Constantes de configuração do simulador."""

# Tamanho do lote de INSERT na tabela leituras.
BATCH_SIZE: int = 500

# Intervalo padrão, em minutos, entre leituras geradas.
PASSO_PADRAO: int = 15

# Sensores que o simulador NÃO gera (ativo=1 mas sem leituras → valida Q04).
SENSOR_IGNORADOS: list[int] = [24]
