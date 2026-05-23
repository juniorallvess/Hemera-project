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
      await Promise.all([
        fetch('/api/leituras/recentes?n=1').then((r) => r.json()),
        fetch('/api/desvios?limit=1').then((r) => r.json()),
        fetch('/api/intervencoes?limit=1').then((r) => r.json()),
      ]);
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
