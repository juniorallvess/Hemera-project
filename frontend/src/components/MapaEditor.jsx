import { useCallback, useEffect, useRef, useState } from "react";
import { useGeometria } from "../hooks/useGeometria";

const PLANTA_URL = "/static/planta.svg";

function paraCoordSVG(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  const x = Math.max(0, Math.min(800, Math.round(p.x)));
  const y = Math.max(0, Math.min(520, Math.round(p.y)));
  return [x, y];
}

export default function MapaEditor({ reloadKey = 0 }) {
  const { comodos, carregando, erro, salvar, apagar } = useGeometria();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const editLayerRef = useRef(null);
  const dragVertexRef = useRef(null);
  const rectStartRef = useRef(null);

  const [statusSvg, setStatusSvg] = useState("loading");
  const [selectedComodoId, setSelectedComodoId] = useState(null);
  const [vertices, setVertices] = useState([]);
  const [polygonClosed, setPolygonClosed] = useState(false);
  const [modo, setModo] = useState("poligono");
  const [rectPreview, setRectPreview] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Nenhum cômodo selecionado.");

  useEffect(() => {
    let cancelled = false;
    setStatusSvg("loading");
    fetch(`${PLANTA_URL}?v=${reloadKey}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((svgText) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svgText;
        const svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) { setStatusSvg("error"); return; }
        svgEl.classList.add("w-full", "h-auto", "max-h-[min(480px,55vh)]", "mx-auto", "block");
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        svgRef.current = svgEl;
        let layer = svgEl.querySelector("#camada-edicao");
        if (!layer) {
          layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
          layer.setAttribute("id", "camada-edicao");
          svgEl.appendChild(layer);
        }
        editLayerRef.current = layer;
        setStatusSvg("ready");
      })
      .catch(() => { if (!cancelled) setStatusSvg("error"); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const selecionarComodo = useCallback((id) => {
    setSelectedComodoId(id);
    const c = comodos.find((c) => c.comodo_id === id);
    if (c?.poligono) {
      setVertices(c.poligono);
      setPolygonClosed(true);
    } else {
      setVertices([]);
      setPolygonClosed(false);
    }
    rectStartRef.current = null;
    setRectPreview(null);
  }, [comodos]);

  // Imperative render of edit layer
  useEffect(() => {
    const layer = editLayerRef.current;
    if (!layer || statusSvg !== "ready") return;
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    // Other comodos' saved polygons
    comodos.forEach((c) => {
      if (!c.poligono || c.comodo_id === selectedComodoId) return;
      const pts = c.poligono.map(([x, y]) => `${x},${y}`).join(" ");
      const poly = document.createElementNS(ns, "polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("fill", "rgba(100,160,220,0.18)");
      poly.setAttribute("stroke", "#5b8fc7");
      poly.setAttribute("stroke-width", "1.5");
      poly.setAttribute("pointer-events", "none");
      layer.appendChild(poly);
      const cx = c.poligono.reduce((s, [x]) => s + x, 0) / c.poligono.length;
      const cy = c.poligono.reduce((s, [, y]) => s + y, 0) / c.poligono.length;
      const txt = document.createElementNS(ns, "text");
      txt.setAttribute("x", cx);
      txt.setAttribute("y", cy);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("dominant-baseline", "central");
      txt.setAttribute("font-size", "11");
      txt.setAttribute("fill", "#3a4a5a");
      txt.setAttribute("pointer-events", "none");
      txt.textContent = c.comodo;
      layer.appendChild(txt);
    });

    // Rect drag preview
    if (rectPreview) {
      const [[ax, ay], [bx, by]] = rectPreview;
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", Math.min(ax, bx));
      rect.setAttribute("y", Math.min(ay, by));
      rect.setAttribute("width", Math.abs(bx - ax));
      rect.setAttribute("height", Math.abs(by - ay));
      rect.setAttribute("fill", "rgba(251,191,36,0.18)");
      rect.setAttribute("stroke", "#f59e0b");
      rect.setAttribute("stroke-width", "2");
      rect.setAttribute("stroke-dasharray", "6,3");
      rect.setAttribute("pointer-events", "none");
      layer.appendChild(rect);
    }

    if (vertices.length === 0) return;

    const pts = vertices.map(([x, y]) => `${x},${y}`).join(" ");
    if (polygonClosed) {
      const poly = document.createElementNS(ns, "polygon");
      poly.setAttribute("points", pts);
      poly.setAttribute("fill", "rgba(251,191,36,0.22)");
      poly.setAttribute("stroke", "#f59e0b");
      poly.setAttribute("stroke-width", "2.5");
      poly.setAttribute("pointer-events", "none");
      layer.appendChild(poly);
    } else {
      const pline = document.createElementNS(ns, "polyline");
      pline.setAttribute("points", pts);
      pline.setAttribute("fill", "none");
      pline.setAttribute("stroke", "#f59e0b");
      pline.setAttribute("stroke-width", "2");
      pline.setAttribute("stroke-dasharray", "6,3");
      pline.setAttribute("pointer-events", "none");
      layer.appendChild(pline);
    }

    // Vertex handles
    vertices.forEach(([x, y], i) => {
      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", "6");
      circle.setAttribute("fill", "#f59e0b");
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("data-vertex-idx", String(i));
      circle.style.cursor = "grab";
      layer.appendChild(circle);
    });
  }, [comodos, selectedComodoId, vertices, polygonClosed, rectPreview, statusSvg]);

  // Status line
  useEffect(() => {
    const c = comodos.find((c) => c.comodo_id === selectedComodoId);
    if (!c) { setStatusMsg("Nenhum cômodo selecionado."); return; }
    setStatusMsg(
      `Cômodo: ${c.comodo} — ${vertices.length} vértice${vertices.length !== 1 ? "s" : ""}${polygonClosed ? " (fechado)" : " (aberto)"}`
    );
  }, [comodos, selectedComodoId, vertices, polygonClosed]);

  // SVG pointer/click handlers
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || statusSvg !== "ready") return;

    const onClick = (e) => {
      if (modo !== "poligono" || polygonClosed || !selectedComodoId) return;
      if (e.target.getAttribute("data-vertex-idx") !== null) return;
      const coord = paraCoordSVG(svg, e);
      if (coord) setVertices((prev) => [...prev, coord]);
    };

    const onPointerDown = (e) => {
      const vtxEl = e.target.closest("[data-vertex-idx]");
      if (vtxEl && polygonClosed) {
        e.preventDefault();
        dragVertexRef.current = { idx: parseInt(vtxEl.getAttribute("data-vertex-idx"), 10) };
        return;
      }
      if (modo === "retangulo" && selectedComodoId) {
        e.preventDefault();
        const coord = paraCoordSVG(svg, e);
        if (coord) {
          rectStartRef.current = coord;
          setRectPreview([coord, coord]);
        }
      }
    };

    const onPointerMove = (e) => {
      if (dragVertexRef.current !== null) {
        const coord = paraCoordSVG(svg, e);
        if (!coord) return;
        const idx = dragVertexRef.current.idx;
        setVertices((prev) => {
          const next = [...prev];
          next[idx] = coord;
          return next;
        });
        return;
      }
      if (modo === "retangulo" && rectStartRef.current) {
        const coord = paraCoordSVG(svg, e);
        if (coord) setRectPreview([rectStartRef.current, coord]);
      }
    };

    const onPointerUp = (e) => {
      if (dragVertexRef.current !== null) {
        dragVertexRef.current = null;
        return;
      }
      if (modo === "retangulo" && rectStartRef.current) {
        const coord = paraCoordSVG(svg, e);
        if (coord) {
          const [ax, ay] = rectStartRef.current;
          const [bx, by] = coord;
          if (Math.abs(bx - ax) > 2 && Math.abs(by - ay) > 2) {
            setVertices([[ax, ay], [bx, ay], [bx, by], [ax, by]]);
            setPolygonClosed(true);
          }
        }
        rectStartRef.current = null;
        setRectPreview(null);
      }
    };

    svg.addEventListener("click", onClick);
    svg.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      svg.removeEventListener("click", onClick);
      svg.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [statusSvg, modo, polygonClosed, selectedComodoId]);

  const handleConcluir = () => {
    if (vertices.length < 3) return;
    setPolygonClosed(true);
  };

  const handleDesfazer = () => {
    if (polygonClosed) return;
    setVertices((prev) => prev.slice(0, -1));
  };

  const handleSalvar = async () => {
    if (!selectedComodoId || !polygonClosed || vertices.length < 3) return;
    try {
      await salvar(selectedComodoId, vertices);
      setStatusMsg("Área salva com sucesso.");
    } catch (e) {
      setStatusMsg(`Erro ao salvar: ${e.message}`);
    }
  };

  const handleApagar = async () => {
    if (!selectedComodoId) return;
    try {
      await apagar(selectedComodoId);
      setVertices([]);
      setPolygonClosed(false);
    } catch (e) {
      setStatusMsg(`Erro ao apagar: ${e.message}`);
    }
  };

  const btnBase = "px-3 py-2 rounded-lg text-sm font-medium transition-all";

  return (
    <section className="flex-1 bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 overflow-hidden min-h-[400px] flex flex-col">
      <div className="p-4 border-b border-outline-variant/30 flex flex-wrap gap-2 items-center">
        <select
          value={selectedComodoId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            selecionarComodo(val ? parseInt(val, 10) : null);
          }}
          className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm border border-outline-variant/40 focus:outline-none"
        >
          <option value="">— Selecione cômodo —</option>
          {comodos.map((c) => (
            <option key={c.comodo_id} value={c.comodo_id}>
              {c.comodo} {c.poligono ? "✓ definido" : "· vazio"}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setModo("poligono")}
          className={`${btnBase} ${modo === "poligono" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
        >
          Polígono
        </button>
        <button
          type="button"
          onClick={() => setModo("retangulo")}
          className={`${btnBase} ${modo === "retangulo" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}
        >
          Retângulo
        </button>
        <button
          type="button"
          onClick={handleConcluir}
          disabled={polygonClosed || vertices.length < 3}
          className={`${btnBase} bg-secondary-container text-on-secondary-container disabled:opacity-40`}
        >
          Concluir
        </button>
        <button
          type="button"
          onClick={handleDesfazer}
          disabled={polygonClosed || vertices.length === 0}
          className={`${btnBase} bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40`}
        >
          Desfazer ponto
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={!selectedComodoId || !polygonClosed || vertices.length < 3}
          className={`${btnBase} bg-primary text-on-primary disabled:opacity-40 hover:opacity-90`}
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={handleApagar}
          disabled={!selectedComodoId}
          className={`${btnBase} bg-error-container text-on-error-container disabled:opacity-40 hover:opacity-90`}
        >
          Apagar área
        </button>
      </div>

      <div className="px-4 py-2 text-xs text-on-surface-variant font-mono border-b border-outline-variant/20 bg-surface-container/30">
        {carregando ? "Carregando cômodos…" : erro ? `Erro: ${erro}` : statusMsg}
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none" />
        {statusSvg === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-outline opacity-50 animate-pulse">
              architecture
            </span>
          </div>
        )}
        {statusSvg === "error" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-error opacity-80">
              broken_image
            </span>
          </div>
        )}
        <div
          ref={containerRef}
          className={`relative z-[1] w-full p-4 flex items-center justify-center ${statusSvg === "ready" ? "opacity-100" : "opacity-0"}`}
          aria-label="Editor de planta"
        />
      </div>
    </section>
  );
}
