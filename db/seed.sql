PRAGMA foreign_keys = ON;

-- =============================================================
-- RESIDÊNCIA
-- =============================================================
INSERT INTO residencias (nome, endereco, data_instalacao) VALUES
    ('Casa Família Silva', 'Rua das Acácias, 42 — São Paulo/SP', '2024-01-15');

-- =============================================================
-- MORADORES
-- =============================================================
INSERT INTO moradores (residencia_id, nome, data_nascimento, perfil) VALUES
    (1, 'Maria Silva',  '1972-03-14', 'adulto_pleno'),
    (1, 'Pedro Silva',  '1970-08-22', 'home_office'),
    (1, 'Lucas Silva',  '2006-11-05', 'jovem_adulto');

-- =============================================================
-- CÔMODOS
-- =============================================================
INSERT INTO comodos (residencia_id, nome, tipo, area_m2) VALUES
    (1, 'quarto_maria',        'quarto',     14.0),
    (1, 'quarto_pedro_maria',  'quarto',     18.0),
    (1, 'quarto_lucas',        'quarto',     12.0),
    (1, 'sala',                'sala',       28.0),
    (1, 'cozinha',             'cozinha',    16.0),
    (1, 'banheiro',            'banheiro',    8.0),
    (1, 'escritorio',          'escritorio', 10.0);

-- =============================================================
-- CATÁLOGOS
-- =============================================================
INSERT INTO tipos_sensor (codigo, descricao, unidade_medida) VALUES
    ('presenca',        'Sensor de presença PIR',          'booleano'),
    ('fluxo_agua',      'Medidor de fluxo de água',        'L/min'),
    ('abertura_porta',  'Sensor magnético de abertura',    'booleano'),
    ('decibel',         'Microfone ambiente',              'dB'),
    ('iluminancia',     'Sensor de luminosidade',          'lux'),
    ('temperatura',     'Sensor de temperatura',           '°C'),
    ('umidade',         'Sensor de umidade relativa',      '%'),
    ('consumo_energia', 'Medidor de consumo elétrico',     'kWh');

INSERT INTO tipos_dispositivo (codigo, descricao) VALUES
    ('lampada',          'Lâmpada inteligente'),
    ('cortina',          'Cortina motorizada'),
    ('ar_condicionado',  'Ar-condicionado smart'),
    ('difusor_aroma',    'Difusor de aromas'),
    ('alto_falante',     'Alto-falante smart'),
    ('fechadura',        'Fechadura eletrônica'),
    ('aquecedor',        'Aquecedor de água');

INSERT INTO acoes_dispositivo (codigo, descricao) VALUES
    ('ligar',               'Liga o dispositivo'),
    ('desligar',            'Desliga o dispositivo'),
    ('dim',                 'Ajusta intensidade/brilho'),
    ('abrir',               'Abre (cortina/fechadura)'),
    ('fechar',              'Fecha (cortina/fechadura)'),
    ('ajustar_temperatura', 'Define temperatura alvo'),
    ('tocar_playlist',      'Inicia playlist'),
    ('ajustar_volume',      'Ajusta volume'),
    ('ativar_aroma',        'Libera aroma específico');

INSERT INTO protocolos (codigo, descricao) VALUES
    ('zigbee', 'Zigbee 3.0'),
    ('matter', 'Matter 1.2'),
    ('knx',    'KNX/IP'),
    ('mqtt',   'MQTT 5.0'),
    ('zwave',  'Z-Wave Plus');

-- =============================================================
-- SENSORES (23 total)
-- cômodos: 1=quarto_maria, 2=quarto_pedro_maria, 3=quarto_lucas,
--          4=sala, 5=cozinha, 6=banheiro, 7=escritorio
-- tipos:   1=presenca, 2=fluxo_agua, 3=abertura_porta, 4=decibel,
--          5=iluminancia, 6=temperatura, 7=umidade, 8=consumo_energia
-- protocolos: 1=zigbee, 2=matter, 3=knx, 4=mqtt, 5=zwave
-- =============================================================
INSERT INTO sensores (comodo_id, tipo_sensor_id, protocolo_id, fabricante, ativo) VALUES
    -- quarto_maria (3 sensores)
    (1, 1, 1, 'Aqara',   1),  -- presença
    (1, 5, 1, 'Aqara',   1),  -- iluminância
    (1, 3, 1, 'Sonoff',  1),  -- abertura_porta
    -- quarto_pedro_maria (2 sensores)
    (2, 1, 1, 'Aqara',   1),  -- presença
    (2, 5, 1, 'Aqara',   1),  -- iluminância
    -- quarto_lucas (3 sensores)
    (3, 1, 1, 'Aqara',   1),  -- presença
    (3, 5, 1, 'Aqara',   1),  -- iluminância
    (3, 3, 1, 'Sonoff',  1),  -- abertura_porta
    -- sala (3 sensores)
    (4, 1, 2, 'Eve',     1),  -- presença
    (4, 4, 4, 'Shelly',  1),  -- decibel
    (4, 5, 2, 'Eve',     1),  -- iluminância
    -- cozinha (3 sensores)
    (5, 1, 2, 'Eve',     1),  -- presença
    (5, 2, 4, 'Shelly',  1),  -- fluxo_agua
    (5, 8, 4, 'Shelly',  1),  -- consumo_energia
    -- banheiro (3 sensores)
    (6, 2, 4, 'Shelly',  1),  -- fluxo_agua
    (6, 1, 1, 'Aqara',   1),  -- presença
    (6, 7, 1, 'Aqara',   1),  -- umidade
    -- escritório (3 sensores)
    (7, 1, 2, 'Eve',     1),  -- presença
    (7, 5, 2, 'Eve',     1),  -- iluminância
    (7, 6, 1, 'Aqara',   1),  -- temperatura
    -- extra: temperatura sala e temperatura quarto_lucas
    (4, 6, 1, 'Aqara',   1),  -- temperatura sala
    (3, 6, 1, 'Aqara',   1),  -- temperatura quarto_lucas
    (2, 6, 1, 'Aqara',   1);  -- temperatura quarto_pedro_maria

-- =============================================================
-- DISPOSITIVOS (18 total)
-- tipos: 1=lampada, 2=cortina, 3=ar_condicionado, 4=difusor_aroma,
--        5=alto_falante, 6=fechadura, 7=aquecedor
-- =============================================================
INSERT INTO dispositivos (comodo_id, tipo_dispositivo_id, protocolo_id, fabricante, ativo) VALUES
    -- quarto_maria (3 dispositivos)
    (1, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (1, 2, 3, 'Somfy',         1),  -- cortina
    (1, 4, 4, 'Aromatize',     1),  -- difusor
    -- quarto_pedro_maria (3 dispositivos)
    (2, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (2, 2, 3, 'Somfy',         1),  -- cortina
    (2, 3, 2, 'LG ThinQ',      1),  -- AC
    -- quarto_lucas (2 dispositivos)
    (3, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (3, 2, 3, 'Somfy',         1),  -- cortina
    -- sala (3 dispositivos)
    (4, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (4, 2, 3, 'Somfy',         1),  -- cortina
    (4, 5, 2, 'Sonos',         1),  -- alto-falante
    -- cozinha (2 dispositivos)
    (5, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (5, 5, 2, 'Sonos',         1),  -- alto-falante
    -- banheiro (2 dispositivos)
    (6, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (6, 7, 4, 'Lorenzetti',    1),  -- aquecedor
    -- escritório (3 dispositivos)
    (7, 1, 2, 'Philips Hue',   1),  -- lâmpada
    (7, 3, 2, 'LG ThinQ',      1),  -- AC
    (7, 5, 2, 'Sonos',         1);  -- alto-falante

-- =============================================================
-- CENAS (8)
-- =============================================================
INSERT INTO cenas (nome, descricao, ativa) VALUES
    ('acolhimento_noturno',   'Luz âmbar 2200K a 15% + difusor lavanda + playlist habitual volume baixo', 1),
    ('despertar_gradual',     'Cortina abre 20%/min + luz quente crescente para acordar suavemente',      1),
    ('silencio_protetivo',    'Desliga sons ambiente + dim geral a 30% para criar quietude',              1),
    ('convite_movimento',     'Acende cozinha + inicia playlist energética volume mínimo',                1),
    ('descompressao_chegada', 'Luz quente sala + cortina fecha + AC 23°C ao chegar em casa',              1),
    ('noite_serena',          'Fecha cortinas + dim geral + difusor camomila para dormir',                1),
    ('manha_silenciosa',      'Cortina 50% + sem som + luz natural para manhã tranquila',                 1),
    ('presenca_companhia',    'Som ambiente baixo + iluminação cálida para evitar isolamento',            1);

-- =============================================================
-- CENA × DISPOSITIVO (30+ linhas)
-- cenas: 1=acolhimento_noturno, 2=despertar_gradual, 3=silencio_protetivo,
--        4=convite_movimento, 5=descompressao_chegada, 6=noite_serena,
--        7=manha_silenciosa, 8=presenca_companhia
-- tipos_disp: 1=lampada, 2=cortina, 3=ac, 4=difusor, 5=alto_falante
-- acoes: 1=ligar, 2=desligar, 3=dim, 4=abrir, 5=fechar,
--        6=ajustar_temperatura, 7=tocar_playlist, 8=ajustar_volume, 9=ativar_aroma
-- =============================================================
INSERT INTO cena_dispositivo (cena_id, tipo_dispositivo_id, acao_id, intensidade, duracao_segundos) VALUES
    -- 1. acolhimento_noturno
    (1, 1, 3, 0.15, 14400),  -- lâmpada dim 15%
    (1, 4, 9, 0.80, 7200),   -- difusor lavanda 80%
    (1, 5, 7, 0.30, 14400),  -- alto-falante playlist
    (1, 5, 8, 0.20, 14400),  -- alto-falante volume 20%
    -- 2. despertar_gradual
    (2, 2, 4, 0.20, 1800),   -- cortina abre 20%
    (2, 1, 3, 0.40, 3600),   -- lâmpada dim crescente 40%
    (2, 1, 1, 1.00, 3600),   -- lâmpada ligar
    -- 3. silencio_protetivo
    (3, 5, 2, 0.00, 7200),   -- alto-falante desligar
    (3, 1, 3, 0.30, 7200),   -- lâmpada dim 30%
    -- 4. convite_movimento
    (4, 1, 1, 0.80, 3600),   -- lâmpada ligar 80%
    (4, 5, 7, 0.40, 3600),   -- alto-falante playlist
    (4, 5, 8, 0.15, 3600),   -- alto-falante volume 15%
    -- 5. descompressao_chegada
    (5, 1, 3, 0.60, 7200),   -- lâmpada dim 60%
    (5, 2, 5, 1.00, 7200),   -- cortina fechar
    (5, 3, 6, 0.70, 7200),   -- AC 23°C
    -- 6. noite_serena
    (6, 2, 5, 1.00, 28800),  -- cortina fechar
    (6, 1, 3, 0.20, 28800),  -- lâmpada dim 20%
    (6, 4, 9, 0.60, 14400),  -- difusor camomila
    (6, 5, 2, 0.00, 28800),  -- alto-falante desligar
    -- 7. manha_silenciosa
    (7, 2, 4, 0.50, 3600),   -- cortina abrir 50%
    (7, 5, 2, 0.00, 3600),   -- alto-falante desligar
    (7, 1, 3, 0.50, 3600),   -- lâmpada dim 50%
    -- 8. presenca_companhia
    (8, 5, 7, 0.30, 7200),   -- alto-falante playlist
    (8, 5, 8, 0.25, 7200),   -- alto-falante volume 25%
    (8, 1, 3, 0.65, 7200),   -- lâmpada dim 65%
    (8, 1, 1, 1.00, 7200),   -- lâmpada ligar
    -- extras para completar 30+
    (1, 2, 5, 1.00, 14400),  -- acolhimento: cortina fechar
    (2, 4, 9, 0.30, 1800),   -- despertar: difusor aroma suave
    (3, 2, 5, 1.00, 7200),   -- silêncio: cortina fechar
    (5, 5, 2, 0.00, 7200),   -- descompressão: desligar som
    (4, 2, 4, 0.80, 3600);   -- convite_movimento: abrir cortina

-- =============================================================
-- AGENDAMENTOS SUTIS (1 por morador)
-- =============================================================
INSERT INTO agendamentos_sutis (morador_id, cena_id, dia_semana, horario, ativo) VALUES
    (1, 2, NULL, '07:00', 1),  -- Maria: despertar_gradual todo dia 7h
    (2, 2, NULL, '07:00', 1),  -- Pedro: despertar_gradual todo dia 7h
    (3, 7, NULL, '09:00', 1);  -- Lucas: manha_silenciosa todo dia 9h

-- =============================================================
-- Q03 — LEFT JOIN: cômodo sem sensores
-- 'lavanderia' sem nenhum sensor → aparece em Q03 como gap de cobertura
-- =============================================================
INSERT INTO comodos (residencia_id, nome, tipo, area_m2)
VALUES (1, 'lavanderia', 'area_servico', 6.0);

-- =============================================================
-- Q04 — RIGHT JOIN (via LEFT invertido): sensor ativo sem leituras
-- Sensor de umidade extra no escritório com ativo=1
-- O simulador NÃO gera leituras para este sensor (simulador/config.py → SENSOR_IGNORADOS)
-- comodo_id=7 (escritorio), tipo_sensor_id=7 (umidade), protocolo_id=1 (zigbee)
-- Este sensor recebe id=24 após os 23 acima
-- =============================================================
INSERT INTO sensores (comodo_id, tipo_sensor_id, protocolo_id, fabricante, ativo)
VALUES (7, 7, 1, 'Aqara', 1);
