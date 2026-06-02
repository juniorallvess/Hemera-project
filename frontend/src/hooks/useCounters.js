import { useCallback, useEffect, useState } from 'react';

export function useCounters() {
  const [leituras, setLeituras] = useState(0);
  const [desvios, setDesvios] = useState(0);
  const [intervencoes, setIntervencoes] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('—');

  const atualizarControle = useCallback((msg) => {
    if (msg.tipo === 'leitura') setLeituras((n) => n + 1);
    if (msg.tipo === 'desvio') setDesvios((n) => n + 1);
    if (msg.tipo === 'intervencao') setIntervencoes((n) => n + 1);
    setUltimaAtualizacao(new Date().toTimeString().slice(0, 8));
  }, []);

  const refreshContagens = useCallback(async () => {
    try {
      const res = await fetch('/api/contadores');
      if (!res.ok) return;
      const data = await res.json();
      setLeituras(data.leituras ?? 0);
      setDesvios(data.desvios ?? 0);
      setIntervencoes(data.intervencoes ?? 0);
      setUltimaAtualizacao(new Date().toTimeString().slice(0, 8));
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshContagens();
    const id = setInterval(refreshContagens, 10000);
    return () => clearInterval(id);
  }, [refreshContagens]);

  return { leituras, desvios, intervencoes, ultimaAtualizacao, atualizarControle };
}
