import { useCallback, useEffect, useState } from "react";

const ENDPOINTS = {
  ocupacao: "/api/analises/ocupacao-comodos",
  atividade: "/api/analises/atividade-horaria",
  transicoes: "/api/analises/transicoes",
  alertas: "/api/analises/alertas",
};

export function useAnalises(intervaloMs = 0) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setErro(null);
      const entradas = await Promise.all(
        Object.entries(ENDPOINTS).map(async ([k, url]) => {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`${url} → ${r.status}`);
          return [k, await r.json()];
        })
      );
      setDados(Object.fromEntries(entradas));
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
    if (intervaloMs > 0) {
      const id = setInterval(recarregar, intervaloMs);
      return () => clearInterval(id);
    }
  }, [recarregar, intervaloMs]);

  return { dados, carregando, erro, recarregar };
}
