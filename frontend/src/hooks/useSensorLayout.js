import { useCallback, useEffect, useState } from 'react';

export function useSensorLayout() {
  const [layout, setLayout] = useState([]);
  const [dispositivosLayout, setDispositivosLayout] = useState([]);
  const [plantaInfo, setPlantaInfo] = useState({ fonte: 'padrao' });
  const [tipos, setTipos] = useState({ sensores: [], dispositivos: [] });
  const [comodos, setComodos] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [layRes, dispRes, infoRes, tiposRes, comedosRes] = await Promise.all([
        fetch('/api/sensores/layout'),
        fetch('/api/dispositivos/layout'),
        fetch('/api/planta/info'),
        fetch('/api/tipos'),
        fetch('/api/comodos'),
      ]);
      if (layRes.ok) setLayout(await layRes.json());
      if (dispRes.ok) setDispositivosLayout(await dispRes.json());
      if (infoRes.ok) setPlantaInfo(await infoRes.json());
      if (tiposRes.ok) setTipos(await tiposRes.json());
      if (comedosRes.ok) setComodos(await comedosRes.json());
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const salvarPosicao = useCallback(async (sensorId, posX, posY) => {
    const res = await fetch(`/api/sensores/${sensorId}/posicao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pos_x: posX, pos_y: posY }),
    });
    if (res.ok) {
      setLayout((prev) =>
        prev.map((s) =>
          s.id === sensorId ? { ...s, pos_x: posX, pos_y: posY } : s,
        ),
      );
    }
    return res.ok;
  }, []);

  const salvarPosicaoDispositivo = useCallback(async (dispId, posX, posY) => {
    const res = await fetch(`/api/dispositivos/${dispId}/posicao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pos_x: posX, pos_y: posY }),
    });
    if (res.ok) {
      setDispositivosLayout((prev) =>
        prev.map((d) =>
          d.id === dispId ? { ...d, pos_x: posX, pos_y: posY } : d,
        ),
      );
    }
    return res.ok;
  }, []);

  const criarSensor = useCallback(async (tipo_sensor_id, comodo_id, pos_x, pos_y) => {
    const res = await fetch('/api/sensores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_sensor_id, comodo_id, pos_x, pos_y }),
    });
    if (!res.ok) return null;
    const novo = await res.json();
    setLayout((prev) => [...prev, novo]);
    return novo;
  }, []);

  const criarDispositivo = useCallback(async (tipo_dispositivo_id, comodo_id, pos_x, pos_y) => {
    const res = await fetch('/api/dispositivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_dispositivo_id, comodo_id, pos_x, pos_y }),
    });
    if (!res.ok) return null;
    const novo = await res.json();
    setDispositivosLayout((prev) => [...prev, novo]);
    return novo;
  }, []);

  const deletarSensor = useCallback(async (sensorId) => {
    const res = await fetch(`/api/sensores/${sensorId}`, { method: 'DELETE' });
    if (res.ok) setLayout((prev) => prev.filter((s) => s.id !== sensorId));
    return res.ok;
  }, []);

  const deletarDispositivo = useCallback(async (dispId) => {
    const res = await fetch(`/api/dispositivos/${dispId}`, { method: 'DELETE' });
    if (res.ok) setDispositivosLayout((prev) => prev.filter((d) => d.id !== dispId));
    return res.ok;
  }, []);

  const uploadPlanta = useCallback(
    async (file) => {
      const fd = new FormData();
      fd.append('arquivo', file);
      const res = await fetch('/api/planta/upload', { method: 'POST', body: fd });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh],
  );

  return {
    layout,
    dispositivosLayout,
    plantaInfo,
    tipos,
    comodos,
    loading,
    refresh,
    salvarPosicao,
    salvarPosicaoDispositivo,
    criarSensor,
    criarDispositivo,
    deletarSensor,
    deletarDispositivo,
    uploadPlanta,
  };
}
