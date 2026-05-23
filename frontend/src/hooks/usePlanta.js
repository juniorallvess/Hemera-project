import { useCallback, useRef } from 'react';

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

export function usePlanta() {
  const svgRootRef = useRef(null);
  const moradoresRef = useRef(new Map());

  const onPlantaReady = useCallback((svgEl) => {
    svgRootRef.current = svgEl;
    let layer = svgEl.querySelector('#camada-moradores');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      layer.setAttribute('id', 'camada-moradores');
      svgEl.appendChild(layer);
    }
    moradoresRef.current.clear();
  }, []);

  const aplicarLayout = useCallback((layout) => {
    const svg = svgRootRef.current;
    if (!svg || !layout?.length) return;

    let overlay = svg.querySelector('#camada-sensores-overlay');
    if (!overlay) {
      overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.setAttribute('id', 'camada-sensores-overlay');
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

  const moverMorador = useCallback((moradorId, x, y, comodo) => {
    const svg = svgRootRef.current;
    if (!svg) return;
    const layer = svg.querySelector('#camada-moradores');
    if (!layer) return;

    let g = moradoresRef.current.get(moradorId);
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'morador-marker');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '10');
      circle.setAttribute('fill', CORES_MORADOR[(moradorId - 1) % CORES_MORADOR.length]);
      circle.setAttribute('stroke', '#faf5ee');
      circle.setAttribute('stroke-width', '2');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'morador-label');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('y', '4');
      label.setAttribute('font-size', '9');
      label.setAttribute('fill', '#faf5ee');
      label.textContent = String(moradorId);
      g.appendChild(circle);
      g.appendChild(label);
      layer.appendChild(g);
      moradoresRef.current.set(moradorId, g);
    }

    const grupo = svg.querySelector(`#comodo_${comodo}`);
    let tx = x;
    let ty = y;
    if (grupo) {
      const box = grupo.getBBox?.();
      if (box) {
        tx = box.x + box.width / 2;
        ty = box.y + box.height / 2;
      }
    }
    g.setAttribute('transform', `translate(${tx}, ${ty})`);
    g.classList.add('ativo');
    setTimeout(() => g.classList.remove('ativo'), 1200);
  }, []);

  const pulsarComodo = useCallback((comodoRef) => {
    const svg = svgRootRef.current;
    if (!svg) return;
    const nome =
      typeof comodoRef === 'number' ? COMODO_ID_NOME[comodoRef] : comodoRef;
    const grupo = nome ? svg.querySelector(`#comodo_${nome}`) : null;
    const alvos = grupo
      ? grupo.querySelectorAll('.device-icon, .sensor-dot')
      : svg.querySelectorAll('.device-icon');
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

  const atualizarPlanta = useCallback(
    (msg) => {
      if (!svgRootRef.current) return;

      if (msg.tipo === 'morador_movimento' && msg.morador_id) {
        moverMorador(msg.morador_id, msg.x, msg.y, msg.comodo);
      }

      if (msg.tipo === 'intervencao' && msg.comodo_id) {
        pulsarComodo(msg.comodo_id);
      }

      if (msg.tipo === 'leitura' && msg.comodo && msg.valor > 0) {
        pulsarSensor(msg.comodo, msg.sensor_tipo);
      }
    },
    [pulsarComodo, pulsarSensor, moverMorador],
  );

  return { onPlantaReady, aplicarLayout, adicionarItem, atualizarPlanta };
}
