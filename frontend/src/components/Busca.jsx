import { useEffect, useState } from 'react';

async function carregarEntidades() {
  const r = await fetch('/api/busca/entidades');
  if (!r.ok) throw new Error(`entidades → ${r.status}`);
  return (await r.json()).entidades;
}

async function executarBusca(corpo) {
  const r = await fetch('/api/busca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || `busca → ${r.status}`);
  return j;
}

function LinhaCondicao({ meta, linha, onChange, onRemover, podRemover }) {
  const campos = Object.keys(meta);
  const campo = linha.campo || campos[0] || '';
  const operadores = meta[campo]?.operadores || [];
  const operador = linha.operador || operadores[0] || '';

  function handleCampo(e) {
    const c = e.target.value;
    const ops = meta[c]?.operadores || [];
    const tipo = meta[c]?.tipo;
    const op = tipo === 'texto' && ops.includes('LIKE') ? 'LIKE' : ops[0] || '';
    onChange({ campo: c, operador: op, valor: '' });
  }

  function handleOperador(e) {
    onChange({ ...linha, operador: e.target.value });
  }

  function handleValor(e) {
    onChange({ ...linha, valor: e.target.value });
  }

  const selCls =
    'bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary';
  const inputCls =
    'flex-1 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select className={selCls} value={campo} onChange={handleCampo}>
        {campos.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select className={selCls} value={operador} onChange={handleOperador}>
        {operadores.map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
      <input
        className={inputCls}
        type="text"
        placeholder="valor"
        value={linha.valor}
        onChange={handleValor}
      />
      {podRemover && (
        <button
          type="button"
          onClick={onRemover}
          className="text-error hover:text-error/70 text-sm px-2 py-1 rounded transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function linhaVazia(meta, entidade) {
  const campos = Object.keys(meta[entidade] || {});
  const campo = campos[0] || '';
  const tipoCampo = meta[entidade]?.[campo]?.tipo;
  const ops = meta[entidade]?.[campo]?.operadores || [];
  const operador = tipoCampo === 'texto' && ops.includes('LIKE') ? 'LIKE' : ops[0] || '';
  return { campo, operador, valor: '' };
}

export default function Busca() {
  const [meta, setMeta] = useState({});
  const [erroMeta, setErroMeta] = useState(null);
  const [entidade, setEntidade] = useState('');
  const [nivel, setNivel] = useState('basica');

  const [linhasBasica, setLinhasBasica] = useState([{ campo: '', operador: '', valor: '' }]);
  const [linhasInter, setLinhasInter] = useState([{ campo: '', operador: '', valor: '' }]);
  const [grupos, setGrupos] = useState([
    { combinador: 'AND', linhas: [{ campo: '', operador: '', valor: '' }] },
  ]);
  const [combinadorTop, setCombinadorTop] = useState('AND');

  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erroResultado, setErroResultado] = useState(null);

  useEffect(() => {
    carregarEntidades()
      .then((e) => {
        setMeta(e);
        const primeira = Object.keys(e)[0] || '';
        setEntidade(primeira);
        if (primeira) {
          const vazia = linhaVazia(e, primeira);
          setLinhasBasica([{ ...vazia }]);
          setLinhasInter([{ ...vazia }]);
          setGrupos([{ combinador: 'AND', linhas: [{ ...vazia }] }]);
        }
      })
      .catch((err) => setErroMeta(err.message));
  }, []);

  function handleEntidade(e) {
    const ent = e.target.value;
    setEntidade(ent);
    const vazia = linhaVazia(meta, ent);
    setLinhasBasica([{ ...vazia }]);
    setLinhasInter([{ ...vazia }]);
    setGrupos([{ combinador: 'AND', linhas: [{ ...vazia }] }]);
    setResultado(null);
    setErroResultado(null);
  }

  const metaEnt = meta[entidade] || {};

  // --- Básica ---
  function updateLinhaBasica(idx, nova) {
    setLinhasBasica((prev) => prev.map((l, i) => (i === idx ? nova : l)));
  }

  // --- Intermediária ---
  function updateLinhaInter(idx, nova) {
    setLinhasInter((prev) => prev.map((l, i) => (i === idx ? nova : l)));
  }
  function addLinhaInter() {
    setLinhasInter((prev) => [...prev, { ...linhaVazia(meta, entidade) }]);
  }
  function removeLinhaInter(idx) {
    setLinhasInter((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- Avançada ---
  function updateGrupoLinha(gi, li, nova) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, linhas: g.linhas.map((l, j) => (j === li ? nova : l)) } : g,
      ),
    );
  }
  function addGrupoLinha(gi) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, linhas: [...g.linhas, { ...linhaVazia(meta, entidade) }] } : g,
      ),
    );
  }
  function removeGrupoLinha(gi, li) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, linhas: g.linhas.filter((_, j) => j !== li) } : g,
      ),
    );
  }
  function addGrupo() {
    setGrupos((prev) => [...prev, { combinador: 'AND', linhas: [{ ...linhaVazia(meta, entidade) }] }]);
  }
  function removeGrupo(gi) {
    setGrupos((prev) => prev.filter((_, i) => i !== gi));
  }
  function updateGrupoCombinador(gi, val) {
    setGrupos((prev) => prev.map((g, i) => (i === gi ? { ...g, combinador: val } : g)));
  }

  // --- Submit ---
  async function handleBuscar() {
    setErroResultado(null);
    setResultado(null);

    let corpo;
    if (nivel === 'basica') {
      const [l] = linhasBasica;
      if (!l?.valor) { setErroResultado('Preencha o valor da condição.'); return; }
      corpo = { entidade, combinador: 'AND', condicoes: [{ campo: l.campo, operador: l.operador, valor: l.valor }] };
    } else if (nivel === 'intermediaria') {
      if (linhasInter.some((l) => !l.valor)) { setErroResultado('Preencha todos os valores.'); return; }
      corpo = {
        entidade,
        combinador: 'AND',
        condicoes: linhasInter.map((l) => ({ campo: l.campo, operador: l.operador, valor: l.valor })),
      };
    } else {
      for (const g of grupos) {
        if (g.linhas.some((l) => !l.valor)) { setErroResultado('Preencha todos os valores nos grupos.'); return; }
      }
      corpo = {
        entidade,
        combinador: combinadorTop,
        grupos: grupos.map((g) => ({
          combinador: g.combinador,
          condicoes: g.linhas.map((l) => ({ campo: l.campo, operador: l.operador, valor: l.valor })),
        })),
      };
    }

    setBuscando(true);
    try {
      const res = await executarBusca(corpo);
      setResultado(res);
    } catch (err) {
      setErroResultado(err.message);
    } finally {
      setBuscando(false);
    }
  }

  const btnNivel = (id, label) =>
    `py-1.5 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 ${
      nivel === id
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-surface-container hover:bg-secondary-container/40 text-on-surface-variant'
    }`;

  const selCls =
    'bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary';

  if (erroMeta) {
    return (
      <div className="text-error text-sm p-4 rounded-lg bg-error-container/20">
        Erro ao carregar entidades: {erroMeta}
      </div>
    );
  }

  if (!entidade) {
    return <div className="text-on-surface-variant text-sm">Carregando entidades…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Entidade + nível */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">
            Entidade
          </label>
          <select className={selCls} value={entidade} onChange={handleEntidade}>
            {Object.keys(meta).map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">
            Nível
          </label>
          <div className="flex gap-2">
            {[['basica', 'Básica'], ['intermediaria', 'Intermediária'], ['avancada', 'Avançada']].map(
              ([id, lbl]) => (
                <button key={id} type="button" className={btnNivel(id)} onClick={() => { setNivel(id); setResultado(null); setErroResultado(null); }}>
                  {lbl}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Builder */}
      <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-3">
        {nivel === 'basica' && (
          <LinhaCondicao
            meta={metaEnt}
            linha={linhasBasica[0]}
            onChange={(n) => updateLinhaBasica(0, n)}
            podRemover={false}
          />
        )}

        {nivel === 'intermediaria' && (
          <>
            {linhasInter.map((l, i) => (
              <LinhaCondicao
                key={i}
                meta={metaEnt}
                linha={l}
                onChange={(n) => updateLinhaInter(i, n)}
                onRemover={() => removeLinhaInter(i)}
                podRemover={linhasInter.length > 1}
              />
            ))}
            <button
              type="button"
              onClick={addLinhaInter}
              className="self-start text-sm text-primary hover:text-primary/70 font-medium transition-colors"
            >
              + Condição
            </button>
          </>
        )}

        {nivel === 'avancada' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">Combinador raiz:</span>
              <select className={selCls} value={combinadorTop} onChange={(e) => setCombinadorTop(e.target.value)}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>
            {grupos.map((g, gi) => (
              <div key={gi} className="border border-outline-variant rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant font-medium">Grupo {gi + 1} —</span>
                    <select
                      className={selCls}
                      value={g.combinador}
                      onChange={(e) => updateGrupoCombinador(gi, e.target.value)}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                  {grupos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGrupo(gi)}
                      className="text-error hover:text-error/70 text-xs px-2 py-1 rounded transition-colors"
                    >
                      Remover grupo
                    </button>
                  )}
                </div>
                {g.linhas.map((l, li) => (
                  <LinhaCondicao
                    key={li}
                    meta={metaEnt}
                    linha={l}
                    onChange={(n) => updateGrupoLinha(gi, li, n)}
                    onRemover={() => removeGrupoLinha(gi, li)}
                    podRemover={g.linhas.length > 1}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => addGrupoLinha(gi)}
                  className="self-start text-xs text-primary hover:text-primary/70 font-medium transition-colors"
                >
                  + Condição
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addGrupo}
              className="self-start text-sm text-primary hover:text-primary/70 font-medium transition-colors"
            >
              + Grupo
            </button>
          </>
        )}
      </div>

      {/* Buscar */}
      <button
        type="button"
        onClick={handleBuscar}
        disabled={buscando}
        className="self-start bg-primary text-on-primary px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95"
      >
        {buscando ? 'Buscando…' : 'Buscar'}
      </button>

      {/* Erro */}
      {erroResultado && (
        <div className="text-error text-sm p-3 rounded-lg bg-error-container/20 border border-error/30">
          {erroResultado}
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mb-1">
              SQL gerado (parametrizado)
            </p>
            <pre className="bg-surface-container-high rounded-xl p-4 text-xs text-on-surface overflow-x-auto">
              <code>{resultado.sql}</code>
            </pre>
            {resultado.params?.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-1">
                Parâmetros: {JSON.stringify(resultado.params)}
              </p>
            )}
          </div>

          <p className="text-xs text-on-surface-variant">
            Total: <span className="font-semibold text-on-surface">{resultado.total}</span> resultado(s)
          </p>

          {resultado.total === 0 ? (
            <p className="text-sm text-on-surface-variant italic">Nenhum resultado.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-container">
                  <tr>
                    {resultado.colunas.map((c) => (
                      <th
                        key={c}
                        className="px-4 py-2 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.linhas.map((linha, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? 'bg-surface' : 'bg-surface-container/40'}
                    >
                      {resultado.colunas.map((c) => (
                        <td key={c} className="px-4 py-2 text-on-surface whitespace-nowrap">
                          {linha[c] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
