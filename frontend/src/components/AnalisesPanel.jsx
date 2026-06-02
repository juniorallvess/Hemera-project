import { useAnalises } from "../hooks/useAnalises";

export default function AnalisesPanel() {
  const { dados, carregando, erro, recarregar } = useAnalises(15000);

  return (
    <section className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl text-on-surface">
          Análises Comportamentais
        </h2>
        <button
          type="button"
          onClick={recarregar}
          className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container text-sm font-medium hover:bg-primary hover:text-on-primary transition-colors active:scale-95"
        >
          Atualizar
        </button>
      </div>

      {carregando && !dados && <Skeleton />}

      {erro && (
        <div className="bg-error-container text-on-error-container rounded-xl p-6 text-sm">
          Erro ao carregar análises: {erro}
        </div>
      )}

      {dados && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PanelOcupacao comodos={dados.ocupacao?.comodos ?? []} />
          <PanelAtividade atividade={dados.atividade} />
          <PanelTransicoes transicoes={dados.transicoes?.transicoes ?? []} />
          <PanelAlertas alertas={dados.alertas?.alertas ?? []} />
        </div>
      )}
    </section>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 p-6 flex flex-col gap-4">
      <h3 className="font-headline text-lg text-on-surface border-b border-outline-variant/30 pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 h-48 animate-pulse"
        />
      ))}
    </div>
  );
}

function PanelOcupacao({ comodos }) {
  return (
    <Card title="Tempo de Permanência (por cômodo)">
      {comodos.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          Sem dados de ocupação ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {comodos.map((c) => (
            <div key={c.comodo_id} className="flex items-center gap-3">
              <span
                className="text-sm text-on-surface-variant shrink-0 w-28 truncate"
                title={c.comodo}
              >
                {c.comodo}
              </span>
              <div className="flex-1 bg-surface-container rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(c.percentual_ocupacao, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-on-surface w-12 text-right shrink-0">
                {c.percentual_ocupacao.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PanelAtividade({ atividade }) {
  const casa = atividade?.casa ?? [];
  const porComodo = atividade?.por_comodo ?? [];

  const maxCasa = Math.max(...casa.map((h) => h.ocupacoes), 1);
  const peakHora = casa.reduce(
    (best, h) => (h.ocupacoes > best.ocupacoes ? h : best),
    casa[0] ?? { hora: 0, ocupacoes: 0 }
  );

  const globalMax = Math.max(
    1,
    ...porComodo.flatMap((c) => c.horas)
  );

  const labelHoras = new Set([0, 6, 12, 18, 23]);

  return (
    <Card title="Atividade por Horário">
      {casa.length === 0 && porComodo.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Sem dados de atividade ainda.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* casa bars */}
          <div>
            <p className="text-xs text-on-surface-variant mb-2">
              Atividade geral — pico às {peakHora.hora}h
            </p>
            <div className="flex items-end gap-[2px] h-16">
              {casa.map((h) => {
                const height = maxCasa > 0 ? (h.ocupacoes / maxCasa) * 100 : 0;
                const isPeak = h.hora === peakHora.hora;
                return (
                  <div
                    key={h.hora}
                    className="flex-1 flex flex-col justify-end"
                    title={`${h.hora}h: ${h.ocupacoes} ocupações`}
                  >
                    <div
                      style={{ height: `${Math.max(height, 4)}%` }}
                      className={`rounded-t transition-all ${
                        isPeak ? "bg-primary" : "bg-primary-container"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 px-0">
              {casa.map((h) =>
                labelHoras.has(h.hora) ? (
                  <span
                    key={h.hora}
                    className="text-[10px] text-on-surface-variant"
                    style={{ width: `${100 / 24}%`, textAlign: "center" }}
                  >
                    {h.hora}h
                  </span>
                ) : null
              )}
            </div>
          </div>

          {/* heatmap */}
          {porComodo.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-on-surface-variant mb-2">
                Heatmap por cômodo
              </p>
              <div className="flex flex-col gap-[2px]">
                {porComodo.map((c) => (
                  <div key={c.comodo} className="flex items-center gap-1">
                    <span
                      className="text-[10px] text-on-surface-variant shrink-0 w-20 truncate text-right pr-1"
                      title={c.comodo}
                    >
                      {c.comodo}
                    </span>
                    <div
                      className="grid gap-[1px] flex-1"
                      style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                    >
                      {c.horas.map((val, hora) => {
                        const opacity = globalMax > 0 ? val / globalMax : 0;
                        return (
                          <div
                            key={hora}
                            title={`${c.comodo} ${hora}h: ${val}`}
                            style={{
                              backgroundColor: `rgba(194, 101, 42, ${opacity})`,
                              height: "10px",
                            }}
                            className="rounded-sm"
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function PanelTransicoes({ transicoes }) {
  const maxTotal = Math.max(...transicoes.map((t) => t.total), 1);

  return (
    <Card title="Padrões de Movimentação">
      {transicoes.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          Sem transições registradas.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-on-surface-variant -mt-2">
            aproximado — nível casa
          </p>
          {transicoes.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-on-surface shrink-0 w-36 truncate" title={`${t.de} → ${t.para}`}>
                {t.de} → {t.para}
              </span>
              <div className="flex-1 bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(t.total / maxTotal) * 100}%` }}
                />
              </div>
              <span className="text-sm text-on-surface-variant w-8 text-right shrink-0">
                {t.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PanelAlertas({ alertas }) {
  return (
    <Card title="Alertas de Comportamento">
      {alertas.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          Nenhum alerta no período.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {alertas.map((a, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 border-l-4 ${
                a.severidade === "alta"
                  ? "border-error bg-error-container/40"
                  : "border-primary-container bg-surface-container-low"
              }`}
            >
              <p className="text-sm font-medium text-on-surface">{a.mensagem}</p>
              <p className="text-xs text-on-surface-variant mt-1">{a.quando}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {a.morador && (
                  <Chip label={a.morador} />
                )}
                {a.comodo && (
                  <Chip label={a.comodo} muted />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Chip({ label, muted = false }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
        muted
          ? "bg-surface-container text-on-surface-variant"
          : "bg-secondary-container text-on-secondary-container"
      }`}
    >
      {label}
    </span>
  );
}
