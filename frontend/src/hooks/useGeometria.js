import { useCallback, useEffect, useState } from "react";

export function useGeometria() {
  const [comodos, setComodos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setErro(null);
      const r = await fetch("/api/comodos/geometria");
      if (!r.ok) throw new Error(`GET geometria → ${r.status}`);
      const j = await r.json();
      setComodos(j.comodos || []);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  const salvar = useCallback(async (comodoId, poligono) => {
    const r = await fetch(`/api/comodos/${comodoId}/geometria`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poligono }),
    });
    if (!r.ok) throw new Error(`PUT geometria → ${r.status}`);
    const j = await r.json();
    await recarregar();
    return j;
  }, [recarregar]);

  const apagar = useCallback(async (comodoId) => {
    const r = await fetch(`/api/comodos/${comodoId}/geometria`, { method: "DELETE" });
    if (!r.ok) throw new Error(`DELETE geometria → ${r.status}`);
    await recarregar();
  }, [recarregar]);

  useEffect(() => { recarregar(); }, [recarregar]);
  return { comodos, carregando, erro, recarregar, salvar, apagar };
}
