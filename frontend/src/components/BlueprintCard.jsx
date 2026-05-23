import { useCallback, useEffect, useRef, useState } from 'react';
import AddItemPopup from './AddItemPopup';

const PLANTA_URL = '/static/planta.svg';

export default function BlueprintCard({
  onPlantaReady,
  aplicarLayout,
  layout,
  dispositivosLayout,
  editMode,
  onSensorMove,
  onDispositivoMove,
  onAddItem,
  tipos,
  comodos,
  reloadKey = 0,
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [addPopup, setAddPopup] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    fetch(`${PLANTA_URL}?v=${reloadKey}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((svgText) => {
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svgText;
        const svgEl = containerRef.current.querySelector('svg');
        if (!svgEl) {
          setStatus('error');
          return;
        }

        svgEl.classList.add('w-full', 'h-auto', 'max-h-[min(480px,55vh)]', 'mx-auto', 'block');
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgRef.current = svgEl;
        onPlantaReady(svgEl);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [onPlantaReady, reloadKey]);

  useEffect(() => {
    if (status !== 'ready') return;
    const all = [...(layout ?? []), ...(dispositivosLayout ?? [])];
    if (all.length && aplicarLayout) aplicarLayout(all);
  }, [status, layout, dispositivosLayout, aplicarLayout]);

  const svgCoords = useCallback((clientX, clientY) => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgEl.getScreenCTM()?.inverse();
    if (!ctm) return null;
    return pt.matrixTransform(ctm);
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !editMode) return undefined;

    const onDown = (e) => {
      const sensor = e.target.closest('[data-sensor-id]');
      const disp = e.target.closest('[data-disp-id]');
      const t = sensor || disp;
      if (!t) return;
      e.preventDefault();
      dragRef.current = {
        el: t,
        id: Number(t.getAttribute(sensor ? 'data-sensor-id' : 'data-disp-id')),
        kind: sensor ? 'sensor' : 'dispositivo',
      };
    };

    const onMove = (e) => {
      if (!dragRef.current) return;
      const { el } = dragRef.current;
      const p = svgCoords(e.clientX, e.clientY);
      if (!p) return;
      if (el.tagName === 'circle') {
        el.setAttribute('cx', p.x);
        el.setAttribute('cy', p.y);
      } else if (el.tagName === 'rect') {
        el.setAttribute('x', p.x - 5.5);
        el.setAttribute('y', p.y - 5.5);
      }
    };

    const onUp = (e) => {
      if (!dragRef.current) return;
      const { el, id, kind } = dragRef.current;
      const p = svgCoords(e.clientX, e.clientY);
      if (p) {
        const x = el.tagName === 'rect' ? p.x : Number(el.getAttribute('cx'));
        const y = el.tagName === 'rect' ? p.y : Number(el.getAttribute('cy'));
        if (kind === 'sensor') onSensorMove?.(id, x, y);
        else onDispositivoMove?.(id, x, y);
      }
      dragRef.current = null;
    };

    const onClick = (e) => {
      if (dragRef.current) return;
      const sensor = e.target.closest('[data-sensor-id]');
      const disp = e.target.closest('[data-disp-id]');
      if (sensor || disp) return;
      const isSvgOrRoom = e.target.closest('svg') !== null;
      if (!isSvgOrRoom) return;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      setAddPopup({
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top,
        svgX: svgCoords(e.clientX, e.clientY)?.x ?? 100,
        svgY: svgCoords(e.clientX, e.clientY)?.y ?? 100,
      });
    };

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('click', onClick);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      svgEl.removeEventListener('pointerdown', onDown);
      svgEl.removeEventListener('click', onClick);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [editMode, onSensorMove, onDispositivoMove, svgCoords, status]);

  const handleAdd = useCallback(
    async ({ categoria, tipoId, comodoId }) => {
      if (!addPopup) return;
      await onAddItem?.({ categoria, tipoId, comodoId, pos_x: addPopup.svgX, pos_y: addPopup.svgY });
      setAddPopup(null);
    },
    [addPopup, onAddItem],
  );

  return (
    <section
      id="section-planta"
      className="flex-1 bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 relative overflow-hidden min-h-[400px] scroll-mt-24"
    >
      {editMode && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-primary text-on-primary text-xs font-bold">
            Modo edição
          </span>
          <span className="text-xs text-on-surface-variant opacity-70">clique na planta para adicionar</span>
        </div>
      )}

      <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none" />

      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-5xl text-outline opacity-50 animate-pulse">
            architecture
          </span>
          <p className="font-body text-sm text-on-surface-variant">Carregando planta…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <span className="material-symbols-outlined text-5xl text-error opacity-80">
            broken_image
          </span>
          <p className="font-body text-sm text-on-surface-variant">
            Não foi possível carregar a planta. Confirme que o backend está em execução.
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className={`relative z-[1] w-full p-4 flex items-center justify-center ${
          status === 'ready' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Planta da casa"
      />

      {addPopup && editMode && (
        <AddItemPopup
          pos={{ x: addPopup.screenX, y: addPopup.screenY }}
          tipos={tipos}
          comodos={comodos}
          onAdd={handleAdd}
          onCancel={() => setAddPopup(null)}
        />
      )}
    </section>
  );
}
