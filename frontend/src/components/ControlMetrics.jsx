import { Activity, AlertTriangle, Zap, Clock } from 'lucide-react';

const METRICS = [
  {
    key: 'leituras',
    label: 'Leituras',
    icon: Activity,
    color: 'text-primary',
    bg: 'bg-primary/8',
    border: 'border-primary/20',
  },
  {
    key: 'desvios',
    label: 'Desvios',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    key: 'intervencoes',
    label: 'Intervenções',
    icon: Zap,
    color: 'text-tertiary',
    bg: 'bg-tertiary/8',
    border: 'border-tertiary/20',
  },
  {
    key: 'ultimaAtualizacao',
    label: 'Última atualização',
    icon: Clock,
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container-high/60',
    border: 'border-outline-variant/30',
    wide: true,
  },
];

export default function ControlMetrics({
  leituras,
  desvios,
  intervencoes,
  ultimaAtualizacao,
}) {
  const values = { leituras, desvios, intervencoes, ultimaAtualizacao };

  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t border-outline-variant/30">
      {METRICS.map(({ key, label, icon: Icon, color, bg, border, wide }) => (
        <div
          key={key}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${bg} ${border} transition-all duration-300 ${wide ? 'flex-1' : ''}`}
        >
          <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
          <span className="text-xs text-on-surface-variant font-medium whitespace-nowrap">
            {label}:
          </span>
          <span className={`text-xs font-bold ${color} tabular-nums`}>
            {values[key] ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
