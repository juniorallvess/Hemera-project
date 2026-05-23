-- =============================================================
-- HEMERA — 12 QUERIES DQL PARA AVALIAÇÃO
-- Executar sobre banco populado (após init_db.py + simulador)
-- =============================================================

-- Q01 — WHERE + AND/OR/NOT
-- Requisito: WHERE com AND, OR e NOT
-- Negócio: Desvios detectados nos últimos 7 dias em cômodos que possuem
--          sensor de presença E sensor de iluminância (mas NÃO só fluxo_agua).
SELECT
    d.id              AS desvio_id,
    m.nome            AS morador,
    co.nome           AS comodo,
    d.intensidade,
    d.detectado_em
FROM desvios_detectados d
JOIN moradores m ON d.morador_id = m.id
JOIN comodos   co ON d.comodo_id  = co.id
WHERE d.detectado_em >= DATETIME('now', '-7 days')
  AND co.id IN (
        SELECT comodo_id FROM sensores s
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE ts.codigo = 'presenca'
      )
  AND co.id IN (
        SELECT comodo_id FROM sensores s
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE ts.codigo = 'iluminancia'
      )
  AND NOT co.id IN (
        SELECT comodo_id FROM sensores s
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE ts.codigo = 'fluxo_agua'
          AND ts.codigo NOT IN ('presenca','iluminancia')
        -- exclui cômodos onde fluxo_agua é o único tipo relevante
      )
ORDER BY d.detectado_em DESC;

-- Q02 — INNER JOIN
-- Requisito: INNER JOIN multi-tabela
-- Negócio: Lista completa de intervenções com morador, cena, cômodo e timestamp.
SELECT
    i.id            AS intervencao_id,
    m.nome          AS morador,
    c.nome          AS cena,
    co.nome         AS comodo,
    i.executada_em,
    i.status
FROM intervencoes i
INNER JOIN moradores m ON i.morador_id = m.id
INNER JOIN cenas     c ON i.cena_id    = c.id
INNER JOIN comodos  co ON i.comodo_id  = co.id
ORDER BY i.executada_em DESC;

-- Q03 — LEFT OUTER JOIN
-- Requisito: LEFT JOIN para encontrar ausências
-- Negócio: Cômodos sem nenhum sensor cadastrado (gap de cobertura).
SELECT
    co.id,
    co.nome   AS comodo,
    co.tipo,
    co.area_m2
FROM comodos co
LEFT JOIN sensores s ON s.comodo_id = co.id
WHERE s.id IS NULL
ORDER BY co.nome;

-- Q04 — RIGHT JOIN simulado (SQLite não tem RIGHT nativo; LEFT com tabelas invertidas)
-- Requisito: RIGHT OUTER JOIN
-- Negócio: Sensores cadastrados que nunca geraram nenhuma leitura.
-- NOTA: SQLite não suporta RIGHT JOIN; equivalência obtida invertendo as tabelas no LEFT JOIN.
SELECT
    s.id            AS sensor_id,
    ts.codigo       AS tipo,
    co.nome         AS comodo,
    s.fabricante
FROM leituras l
LEFT JOIN sensores    s  ON l.sensor_id = s.id
LEFT JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
LEFT JOIN comodos     co  ON s.comodo_id = co.id
-- A inversão lógica: buscamos sensores sem leitura
-- Reescrevendo como LEFT a partir de sensores (equivale ao RIGHT original):
-- Próxima query é a equivalência correta:
WHERE 1=0; -- placeholder; ver consulta abaixo

-- Q04 real — equivalência de RIGHT JOIN via LEFT invertido
SELECT
    s.id            AS sensor_id,
    ts.codigo       AS tipo,
    co.nome         AS comodo,
    s.fabricante
FROM sensores s
LEFT JOIN leituras l ON l.sensor_id = s.id
JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
JOIN comodos     co  ON s.comodo_id      = co.id
WHERE l.id IS NULL
ORDER BY s.id;

-- Q05 — FULL OUTER JOIN (via UNION de dois LEFT JOINs — SQLite não tem FULL nativo)
-- Requisito: FULL OUTER JOIN
-- Negócio: Reconciliação cenas × tipos_dispositivo:
--          cenas sem nenhum tipo de dispositivo associado
--          E tipos de dispositivo sem nenhuma cena associada.
SELECT
    c.nome          AS cena,
    td.codigo       AS tipo_dispositivo,
    'cena_sem_dispositivo' AS situacao
FROM cenas c
LEFT JOIN cena_dispositivo cd ON cd.cena_id = c.id
LEFT JOIN tipos_dispositivo td ON cd.tipo_dispositivo_id = td.id
WHERE cd.id IS NULL

UNION

SELECT
    c.nome          AS cena,
    td.codigo       AS tipo_dispositivo,
    'dispositivo_sem_cena' AS situacao
FROM tipos_dispositivo td
LEFT JOIN cena_dispositivo cd ON cd.tipo_dispositivo_id = td.id
LEFT JOIN cenas c ON cd.cena_id = c.id
WHERE cd.id IS NULL

ORDER BY situacao, cena, tipo_dispositivo;

-- Q06 — GROUP BY
-- Requisito: GROUP BY com função agregada
-- Negócio: Total de intervenções por cômodo no último mês.
SELECT
    co.nome             AS comodo,
    COUNT(i.id)         AS total_intervencoes
FROM comodos co
LEFT JOIN intervencoes i ON i.comodo_id = co.id
    AND i.executada_em >= DATETIME('now', '-30 days')
GROUP BY co.id, co.nome
ORDER BY total_intervencoes DESC, co.nome ASC;

-- Q07 — HAVING
-- Requisito: HAVING após GROUP BY
-- Negócio: Cenas com taxa de aceite_implicito > 60% (candidatas a promover).
SELECT
    c.nome                                          AS cena,
    COUNT(r.id)                                     AS total_reacoes,
    SUM(CASE WHEN r.tipo_reacao='aceite_implicito' THEN 1 ELSE 0 END) AS aceites,
    ROUND(
        100.0 * SUM(CASE WHEN r.tipo_reacao='aceite_implicito' THEN 1 ELSE 0 END)
              / COUNT(r.id), 1
    )                                               AS taxa_aceite_pct
FROM cenas c
JOIN intervencoes i ON i.cena_id = c.id
JOIN reacoes r      ON r.intervencao_id = i.id
GROUP BY c.id, c.nome
HAVING taxa_aceite_pct > 60
ORDER BY taxa_aceite_pct DESC;

-- Q08 — ORDER BY (DESC primário + ASC secundário)
-- Requisito: ORDER BY com ordenação composta
-- Negócio: Sensores ordenados por volume de leituras (mais ativo primeiro),
--          desempate por nome do cômodo (alfabético).
SELECT
    s.id            AS sensor_id,
    ts.codigo       AS tipo,
    co.nome         AS comodo,
    s.fabricante,
    COUNT(l.id)     AS total_leituras
FROM sensores s
LEFT JOIN leituras    l  ON l.sensor_id       = s.id
JOIN tipos_sensor ts     ON s.tipo_sensor_id  = ts.id
JOIN comodos      co     ON s.comodo_id       = co.id
GROUP BY s.id, ts.codigo, co.nome, s.fabricante
ORDER BY total_leituras DESC, co.nome ASC;

-- Q09 — Funções agregadas: SUM, AVG, COUNT, MIN, MAX
-- Requisito: Todas as 5 funções de agregação em uma única query
-- Negócio: Estatísticas de latência entre detecção do desvio e execução da intervenção.
SELECT
    COUNT(i.id)                             AS total_intervencoes,
    ROUND(AVG(
        (JULIANDAY(i.executada_em) - JULIANDAY(d.detectado_em)) * 86400
    ), 2)                                   AS latencia_media_seg,
    MIN(
        (JULIANDAY(i.executada_em) - JULIANDAY(d.detectado_em)) * 86400
    )                                       AS latencia_minima_seg,
    MAX(
        (JULIANDAY(i.executada_em) - JULIANDAY(d.detectado_em)) * 86400
    )                                       AS latencia_maxima_seg,
    SUM(
        (JULIANDAY(i.executada_em) - JULIANDAY(d.detectado_em)) * 86400
    )                                       AS latencia_total_seg
FROM intervencoes i
JOIN desvios_detectados d ON i.desvio_id = d.id;

-- Q10 — Funções de string: UPPER, LOWER, LENGTH, concatenação (|| no SQLite)
-- Requisito: Manipulação de strings via funções SQL
-- Negócio: Relatório formatado das últimas 20 intervenções.
SELECT
    UPPER(m.nome) || ' — ' || LOWER(co.nome) || ' [' || LENGTH(c.nome) || ' chars]'
        AS linha_relatorio,
    i.executada_em,
    i.status
FROM intervencoes i
JOIN moradores m ON i.morador_id = m.id
JOIN cenas     c ON i.cena_id    = c.id
JOIN comodos  co ON i.comodo_id  = co.id
ORDER BY i.executada_em DESC
LIMIT 20;

-- Q11 — Funções de data (strftime)
-- Requisito: Manipulação de datas via funções SQL
-- Negócio: Intervenções agrupadas por dia da semana e faixa horária;
--          intervalo médio entre desvios consecutivos do mesmo morador.
SELECT
    CASE CAST(strftime('%w', i.executada_em) AS INTEGER)
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
    END                                         AS dia_semana,
    strftime('%H', i.executada_em)              AS hora,
    COUNT(*)                                    AS total
FROM intervencoes i
GROUP BY dia_semana, hora
ORDER BY CAST(strftime('%w', i.executada_em) AS INTEGER), hora;

-- Q11b — Intervalo médio entre desvios consecutivos por morador
SELECT
    m.nome                  AS morador,
    COUNT(d.id)             AS total_desvios,
    ROUND(AVG(intervalo), 1) AS intervalo_medio_minutos
FROM (
    SELECT
        d1.morador_id,
        (JULIANDAY(d1.detectado_em) - JULIANDAY(d2.detectado_em)) * 1440 AS intervalo
    FROM desvios_detectados d1
    JOIN desvios_detectados d2
        ON d1.morador_id = d2.morador_id
        AND d1.id = (
            SELECT MIN(d3.id) FROM desvios_detectados d3
            WHERE d3.morador_id = d1.morador_id AND d3.id > d2.id
        )
) sub
JOIN desvios_detectados d ON d.morador_id = sub.morador_id
JOIN moradores m           ON m.id         = sub.morador_id
GROUP BY sub.morador_id, m.nome
ORDER BY intervalo_medio_minutos;

-- Q12 — UNION de 3 SELECTs
-- Requisito: UNION para combinar conjuntos heterogêneos
-- Negócio: Linha do tempo unificada —
--          leituras significativas (presença=1) +
--          intervenções executadas +
--          agendamentos previstos para hoje.
SELECT
    'leitura'       AS tipo_evento,
    l.registrado_em AS momento,
    co.nome         AS comodo,
    ts.codigo       AS descricao,
    CAST(l.valor AS TEXT) AS detalhe
FROM leituras l
JOIN sensores     s  ON l.sensor_id      = s.id
JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
JOIN comodos      co ON s.comodo_id      = co.id
WHERE ts.codigo = 'presenca' AND l.valor = 1
  AND l.registrado_em >= DATETIME('now', '-1 day')

UNION

SELECT
    'intervencao'   AS tipo_evento,
    i.executada_em  AS momento,
    co.nome         AS comodo,
    c.nome          AS descricao,
    i.status        AS detalhe
FROM intervencoes i
JOIN cenas   c  ON i.cena_id   = c.id
JOIN comodos co ON i.comodo_id = co.id

UNION

SELECT
    'agendamento'           AS tipo_evento,
    DATE('now') || ' ' || ag.horario AS momento,
    co.nome                 AS comodo,
    c.nome                  AS descricao,
    'previsto'              AS detalhe
FROM agendamentos_sutis ag
JOIN cenas    c  ON ag.cena_id    = c.id
JOIN moradores m ON ag.morador_id = m.id
JOIN comodos  co ON co.residencia_id = m.residencia_id
WHERE ag.ativo = 1
  AND (ag.dia_semana IS NULL
       OR ag.dia_semana = CAST(strftime('%w', 'now') AS INTEGER))

ORDER BY momento DESC
LIMIT 100;
