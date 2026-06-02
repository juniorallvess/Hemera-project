import { useCallback, useState } from 'react';

export function useQueries() {
  const [activeQuery, setActiveQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const executarQuery = useCallback(async (n) => {
    setActiveQuery(n);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/consultas/q${n}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Consulta Q${n} falhou (${res.status})`);
      }
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { activeQuery, loading, error, result, executarQuery };
}
