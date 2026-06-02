import { useCallback, useRef } from 'react';
import { pontoInteriorAleatorio, pontoCruzamento } from '../utils/geometria';

const PREFIXOS = {
  quarto_maria: 'qm',
  quarto_pedro_maria: 'qpm',
  quarto_lucas: 'ql',
  sala: 'sala',
  cozinha: 'coz',
  banheiro: 'ban',
  escritorio: 'esc',
};

const COMODO_ID_NOME = {
  1: 'quarto_maria',
  2: 'quarto_pedro_maria',
  3: 'quarto_lucas',
  4: 'sala',
  5: 'cozinha',
  6: 'banheiro',
  7: 'escritorio',
};

const CORES_MORADOR = ['#c2652a', '#8c3c3c', '#78706a'];

function svgIdSensor(comodo, tipo) {
  const pref = PREFIXOS[comodo];
  if (!pref) return null;
  const suf = (tipo || '').replace(/_/g, '');
  return `s_${pref}_${suf}`;
}

function animarPorWaypoints(g, waypoints, durMs, onEnd) {
  if (!waypoints || waypoints.length === 0) { onEnd?.(); return; }
  if (waypoints.length === 1) {
    g.setAttribute('transform', `translate(${waypoints[0][0]}, ${waypoints[0][1]})`);
    onEnd?.();
    return;
  }
  const segCount = waypoints.length - 1;
  const segDur = durMs / segCount;
  let startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    if (elapsed >= durMs) {
      const last = waypoints[waypoints.length - 1];
      g.setAttribute('transform', `translate(${last[0]}, ${last[1]})`);
      onEnd?.();
      return;
    }
    const segIdx = Math.min(Math.floor(elapsed / segDur), segCount - 1);
    const t = Math.min((elapsed - segIdx * segDur) / segDur, 1);
    const [x1, y1] = waypoints[segIdx];
    const [x2, y2] = waypoints[segIdx + 1];
    g.setAttribute('transform', `translate(${x1 + (x2 - x1) * t}, ${y1 + (y2 - y1) * t})`);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function usePlanta() {
  const svgRootRef = useRef(null);
  const moradoresRef = useRef(new Map());
  const overdaysRef = useRef(new Map()); // comodo_nome → lighting element
  const centrosPorComodoRef = useRef(new Map()); // comodo_nome → {cx, cy}
  const sensoresPorComodoRef = useRef(new Map()); // comodo_nome → [{x, y}, ...]
  const poligonosPorComodoRef = useRef({}); // comodo_nome → [[x,y],...] | null
  const estadoMoradorRef = useRef(new Map()); // morador_id → { comodo, ponto: [x,y] }

  const onPlantaReady = useCallback((svgEl) => {
    svgRootRef.current = svgEl;
    moradoresRef.current.clear();
    overdaysRef.current.clear();
    estadoMoradorRef.current.clear();

    // Layer 1 (lowest): lighting tints — created here, sits above original SVG content
    let iluminacaoLayer = svgEl.querySelector('#camada-iluminacao');
    if (!iluminacaoLayer) {
      iluminacaoLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      iluminacaoLayer.setAttribute('id', 'camada-iluminacao');
      svgEl.appendChild(iluminacaoLayer);
    }

    // Layer 3 (topmost): resident dots — always re-appended so it's the last SVG child
    let moradorLayer = svgEl.querySelector('#camada-moradores');
    if (!moradorLayer) {
      moradorLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      moradorLayer.setAttribute('id', 'camada-moradores');
    }
    svgEl.appendChild(moradorLayer);

    // Fetch room polygons; refresh on each overview mount
    fetch('/api/comodos/geometria')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.comodos) return;
        const mapa = {};
        data.comodos.forEach((c) => {
          mapa[c.comodo] = c.poligono?.length >= 3 ? c.poligono : null;
        });
        poligonosPorComodoRef.current = mapa;
      })
      .catch(() => {});
  }, []);

  const aplicarLayout = useCallback((layout) => {
    const svg = svgRootRef.current;
    if (!svg || !layout?.length) return;

    // Build sensor centroid map from DB positions (the proven coordinate source)
    const sensoresPorComodo = new Map();
    layout.forEach((s) => {
      if (s.kind !== 'sensor' || s.pos_x == null || s.pos_y == null || !s.comodo) return;
      if (!sensoresPorComodo.has(s.comodo)) sensoresPorComodo.set(s.comodo, []);
      sensoresPorComodo.get(s.comodo).push({ x: s.pos_x, y: s.pos_y });
    });

    const centrosPorComodo = new Map();
    sensoresPorComodo.forEach((pts, comodo) => {
      const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
      const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
      centrosPorComodo.set(comodo, { cx, cy });
    });

    centrosPorComodoRef.current = centrosPorComodo;
    sensoresPorComodoRef.current = sensoresPorComodo;

    // Layer 2: sensor overlay — must sit between iluminacao and moradores
    let overlay = svg.querySelector('#camada-sensores-overlay');
    if (!overlay) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.setAttribute('id', 'camada-sensores-overlay');
    }
    const moradorLayer = svg.querySelector('#camada-moradores');
    if (moradorLayer) {
      svg.insertBefore(overlay, moradorLayer);
      svg.appendChild(moradorLayer); // keep moradores layer last (top paint)
    } else {
      svg.appendChild(overlay);
    }

    layout.forEach((s) => {
      const isDisp = s.kind === 'dispositivo';
      const attrId = isDisp ? 'data-disp-id' : 'data-sensor-id';
      let el = (!isDisp && s.svg_id ? svg.getElementById(s.svg_id) : null)
        || svg.querySelector(`[${attrId}="${s.id}"]`);

      if (!el && s.pos_x != null) {
        if (isDisp) {
          el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          el.setAttribute('width', '11');
          el.setAttribute('height', '11');
          el.setAttribute('rx', '2');
          el.setAttribute('class', 'device-dot');
        } else {
          el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          el.setAttribute('r', '6');
          el.setAttribute('class', 'sensor-dot');
        }
        overlay.appendChild(el);
      }
      if (!el) return;

      el.setAttribute(attrId, String(s.id));
      el.classList.add(isDisp ? 'device-dot' : 'sensor-dot', 'cursor-grab');

      if (s.pos_x != null && s.pos_y != null) {
        if (el.tagName === 'circle') {
          el.setAttribute('cx', s.pos_x);
          el.setAttribute('cy', s.pos_y);
        } else if (el.tagName === 'rect') {
          el.setAttribute('x', s.pos_x - 5.5);
          el.setAttribute('y', s.pos_y - 5.5);
        } else {
          el.setAttribute('transform', `translate(${s.pos_x}, ${s.pos_y})`);
        }
      }
    });
  }, []);

  const adicionarItem = useCallback((item) => {
    const svg = svgRootRef.current;
    if (!svg || item.pos_x == null) return;

    const isDisp = item.kind === 'dispositivo';
    let overlay = svg.querySelector('#camada-sensores-overlay');
    if (!overlay) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.setAttribute('id', 'camada-sensores-overlay');
      svg.appendChild(overlay);
    }

    const attrId = isDisp ? 'data-disp-id' : 'data-sensor-id';
    let el;
    if (isDisp) {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('width', '11');
      el.setAttribute('height', '11');
      el.setAttribute('rx', '2');
      el.setAttribute('x', item.pos_x - 5.5);
      el.setAttribute('y', item.pos_y - 5.5);
      el.setAttribute('class', 'device-dot cursor-grab');
    } else {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('r', '6');
      el.setAttribute('cx', item.pos_x);
      el.setAttribute('cy', item.pos_y);
      el.setAttribute('class', 'sensor-dot cursor-grab');
    }
    el.setAttribute(attrId, String(item.id));
    overlay.appendChild(el);
  }, []);

  const moverMorador = useCallback((moradorId, comodo, comodoId) => {
    const svg = svgRootRef.current;
    if (!svg) return;
    const layer = svg.querySelector('#camada-moradores');
    if (!layer) return;

    const nome = comodo || (comodoId != null ? COMODO_ID_NOME[comodoId] : null);
    if (!nome) return;

    const poligonos = poligonosPorComodoRef.current;
    const poligonoDestino = poligonos[nome];

    let tx, ty;
    if (poligonoDestino?.length) {
      const p = pontoInteriorAleatorio(poligonoDestino);
      tx = p[0];
      ty = p[1];
    } else {
      const centro = centrosPorComodoRef.current.get(nome);
      if (centro) {
        const offsets = [-22, 0, 22];
        tx = centro.cx + offsets[(moradorId - 1) % offsets.length];
        ty = centro.cy + 45;
      } else {
        const grupo = nome ? svg.querySelector(`#comodo_${nome}`) : null;
        if (!grupo) return;
        const box = grupo.getBBox?.();
        if (!box || !box.width || !box.height) return;
        const pad = Math.min(16, box.width / 4, box.height / 4);
        const faixa = [0.5, 0.32, 0.68][(moradorId - 1) % 3];
        tx = box.x + Math.min(Math.max(box.width * faixa, pad), box.width - pad);
        ty = box.y + Math.min(Math.max(box.height * 0.64, pad), box.height - pad);
      }
    }

    if (!isFinite(tx) || !isFinite(ty)) return;

    let g = moradoresRef.current.get(moradorId);
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'morador-marker');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '9');
      circle.setAttribute('fill', CORES_MORADOR[(moradorId - 1) % CORES_MORADOR.length]);
      circle.setAttribute('stroke', '#fff');
      circle.setAttribute('stroke-width', '2');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'morador-label');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('y', '0');
      label.setAttribute('font-size', '9');
      label.setAttribute('fill', '#fff');
      label.setAttribute('pointer-events', 'none');
      label.textContent = String(moradorId);
      g.appendChild(circle);
      g.appendChild(label);
      layer.appendChild(g);
      moradoresRef.current.set(moradorId, g);
    }

    const destino = [tx, ty];
    const estadoAtual = estadoMoradorRef.current.get(moradorId);
    estadoMoradorRef.current.set(moradorId, { comodo: nome, ponto: destino });

    let waypoints;
    try {
      if (
        estadoAtual?.ponto &&
        poligonoDestino?.length &&
        poligonos[estadoAtual.comodo]?.length &&
        estadoAtual.comodo !== nome
      ) {
        const cruzamento = pontoCruzamento(poligonos[estadoAtual.comodo], poligonoDestino);
        waypoints = [estadoAtual.ponto, cruzamento, destino];
      } else if (estadoAtual?.ponto) {
        waypoints = [estadoAtual.ponto, destino];
      } else {
        waypoints = [destino];
      }
    } catch (_) {
      waypoints = [destino];
    }

    animarPorWaypoints(g, waypoints, 800, () => {
      g.classList.add('ativo');
      setTimeout(() => g.classList.remove('ativo'), 1200);
    });
  }, []);

  const pulsarComodo = useCallback((comodoRef) => {
    const svg = svgRootRef.current;
    if (!svg) return;
    const nome =
      typeof comodoRef === 'number' ? COMODO_ID_NOME[comodoRef] : comodoRef;
    const grupo = nome ? svg.querySelector(`#comodo_${nome}`) : null;
    const alvos = grupo
      ? grupo.querySelectorAll('.device-icon, .device-dot, .sensor-dot')
      : svg.querySelectorAll('.device-icon, .device-dot');
    alvos.forEach((d) => {
      d.classList.add('ativo');
      setTimeout(() => d.classList.remove('ativo'), 2000);
    });
  }, []);

  const pulsarSensor = useCallback((comodoNome, tipoSensor) => {
    const svg = svgRootRef.current;
    if (!svg) return;
    const id = svgIdSensor(comodoNome, tipoSensor);
    const el = id ? svg.getElementById(id) : null;
    if (el) {
      el.classList.add('ativo');
      setTimeout(() => el.classList.remove('ativo'), 1500);
    }
  }, []);

  const iluminarComodo = useCallback((comodoNome, ocupado) => {
    const svg = svgRootRef.current;
    if (!svg) return;

    const poligono = poligonosPorComodoRef.current[comodoNome];
    const iluminacaoLayer = svg.querySelector('#camada-iluminacao');
    let overlay = overdaysRef.current.get(comodoNome);

    if (poligono?.length) {
      // Polygon-based tint: replace rect with polygon element if needed
      if (overlay && overlay.tagName !== 'polygon') {
        overlay.parentNode?.removeChild(overlay);
        overlay = null;
      }
      if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        overlay.setAttribute('pointer-events', 'none');
        overlay.setAttribute('class', 'comodo-luz-overlay');
        (iluminacaoLayer || svg).appendChild(overlay);
        overdaysRef.current.set(comodoNome, overlay);
      }
      overlay.setAttribute('points', poligono.map(([x, y]) => `${x},${y}`).join(' '));
      overlay.setAttribute('fill', ocupado ? '#fbbf24' : '#1e3a5f');
      overlay.setAttribute('opacity', ocupado ? '0.18' : '0.08');
    } else {
      // Sensor-bbox fallback (original behavior)
      if (overlay && overlay.tagName !== 'rect') {
        overlay.parentNode?.removeChild(overlay);
        overlay = null;
      }
      const pts = sensoresPorComodoRef.current.get(comodoNome);
      let rx, ry, rw, rh;
      if (pts && pts.length > 0) {
        const PAD = 55;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        rx = Math.min(...xs) - PAD;
        ry = Math.min(...ys) - PAD;
        rw = Math.max(...xs) - Math.min(...xs) + PAD * 2;
        rh = Math.max(...ys) - Math.min(...ys) + PAD * 2;
      } else {
        const grupo = svg.querySelector(`#comodo_${comodoNome}`);
        if (!grupo) return;
        const box = grupo.getBBox?.();
        if (!box || !box.width || !box.height) return;
        rx = box.x; ry = box.y; rw = box.width; rh = box.height;
      }
      if (!overlay) {
        overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        overlay.setAttribute('pointer-events', 'none');
        overlay.setAttribute('class', 'comodo-luz-overlay');
        (iluminacaoLayer || svg).appendChild(overlay);
        overdaysRef.current.set(comodoNome, overlay);
      }
      overlay.setAttribute('x', rx);
      overlay.setAttribute('y', ry);
      overlay.setAttribute('width', rw);
      overlay.setAttribute('height', rh);
      overlay.setAttribute('fill', ocupado ? '#fbbf24' : '#1e3a5f');
      overlay.setAttribute('opacity', ocupado ? '0.18' : '0.08');
    }
  }, []);

  const atualizarPlanta = useCallback(
    (msg) => {
      if (!svgRootRef.current) return;

      if (msg.tipo === 'morador_movimento' && msg.morador_id) {
        moverMorador(msg.morador_id, msg.comodo, msg.comodo_id);
      }

      if (msg.tipo === 'comodo_estado' && msg.comodo) {
        iluminarComodo(msg.comodo, msg.ocupado);
      }

      if (msg.tipo === 'intervencao' && msg.comodo_id) {
        pulsarComodo(msg.comodo_id);
      }

      if (msg.tipo === 'leitura' && msg.comodo && msg.valor > 0) {
        pulsarSensor(msg.comodo, msg.sensor_tipo);
      }
    },
    [pulsarComodo, pulsarSensor, moverMorador, iluminarComodo],
  );

  return { onPlantaReady, aplicarLayout, adicionarItem, atualizarPlanta };
}
