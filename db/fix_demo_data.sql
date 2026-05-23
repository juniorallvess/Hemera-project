PRAGMA foreign_keys = ON;

-- =============================================================
-- Q03 — LEFT JOIN: cômodo sem sensores
-- 'lavanderia' sem nenhum sensor → aparece em Q03 como gap de cobertura
-- =============================================================
INSERT INTO comodos (residencia_id, nome, tipo, area_m2)
VALUES (1, 'lavanderia', 'area_servico', 6.0);

-- =============================================================
-- Q04 — RIGHT JOIN (via LEFT invertido): sensor ativo sem leituras
-- Sensor de umidade extra no escritório com ativo=1
-- O simulador NÃO gera leituras para este sensor (config.py → SENSOR_IGNORADOS)
-- comodo_id=7 (escritorio), tipo_sensor_id=7 (umidade), protocolo_id=1 (zigbee)
-- Este sensor recebe id=24 após os 23 do seed.sql
-- =============================================================
INSERT INTO sensores (comodo_id, tipo_sensor_id, protocolo_id, fabricante, ativo)
VALUES (7, 7, 1, 'Aqara', 1);
