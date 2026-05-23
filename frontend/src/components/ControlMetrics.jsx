export default function ControlMetrics({
  leituras,
  desvios,
  intervencoes,
  ultimaAtualizacao,
}) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant font-body border-t border-outline-variant/30 pt-3">
      <div>
        Leituras: <span className="text-on-surface font-semibold">{leituras}</span>
      </div>
      <div>
        Desvios: <span className="text-on-surface font-semibold">{desvios}</span>
      </div>
      <div>
        Intervenções:{' '}
        <span className="text-on-surface font-semibold">{intervencoes}</span>
      </div>
      <div>
        Última atualização:{' '}
        <span className="text-on-surface font-semibold">{ultimaAtualizacao}</span>
      </div>
    </div>
  );
}
