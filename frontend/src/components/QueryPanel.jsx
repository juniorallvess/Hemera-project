export default function QueryPanel({
  activeQuery,
  loading,
  error,
  result,
  onSelectQuery,
}) {
  return (
    <section
      id="section-queries"
      className="bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 p-6 scroll-mt-24"
    >
      <h3 className="font-headline text-lg text-on-surface mb-4">Consultas DQL</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mb-6">
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const active = activeQuery === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelectQuery(n)}
              className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all active:scale-95 ${
                active
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container hover:bg-secondary-container/50 text-on-surface-variant'
              }`}
            >
              Q{String(n).padStart(2, '0')}
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto min-h-[120px]">
        {loading && (
          <p className="text-center text-on-surface-variant text-sm py-8">
            Carregando…
          </p>
        )}
        {error && (
          <p className="text-center text-error text-sm py-8">Erro: {error}</p>
        )}
        {!loading && !error && !result && (
          <p className="text-center text-on-surface-variant text-sm py-8">
            Selecione uma query acima
          </p>
        )}
        {!loading && !error && result && <QueryTable result={result} />}
      </div>
    </section>
  );
}

function QueryTable({ result }) {
  if (!result.rows || result.rows.length === 0) {
    return (
      <p className="text-center text-on-surface-variant text-sm py-8">
        {result.query || 'Query'} — 0 linhas (sem dados ainda)
      </p>
    );
  }

  const cols = Object.keys(result.rows[0]);

  return (
    <>
      <p className="text-on-surface-variant text-xs mb-4">
        {result.query} — {result.total} linhas
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-on-surface-variant border-b border-outline-variant/30">
            {cols.map((c) => (
              <th key={c} className="pb-3 font-semibold pr-4 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-on-surface divide-y divide-outline-variant/20">
          {result.rows.map((row, idx) => (
            <tr key={idx}>
              {cols.map((c) => (
                <td
                  key={c}
                  className="py-3 pr-4 max-w-[200px] truncate"
                  title={String(row[c] ?? '')}
                >
                  {row[c] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
