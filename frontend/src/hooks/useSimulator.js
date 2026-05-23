import { useCallback, useEffect, useState } from 'react';

export function useSimulator() {
  const [status, setStatus] = useState({
    rodando: false,
    modo: null,
    cenario: 'luto',
    velocidade: 1440,
    dia_simulado: 0,
    dias: 30,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/simulador/status');
      if (res.ok) setStatus(await res.json());
    } catch (_) {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const iniciar = useCallback(
    async (opts) => {
      setLoading(true);
      try {
        const res = await fetch('/api/simulador/iniciar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts),
        });
        if (res.ok) setStatus(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const parar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulador/parar', { method: 'POST' });
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, iniciar, parar, refresh };
}
