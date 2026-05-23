import ControlMetrics from './ControlMetrics';

const CENARIO_LABEL = {
  normal: 'Normal',
  luto: 'Luto',
  insonia: 'Insônia',
  celebracao: 'Celebração',
};

export default function AppHeader({ connected, metrics, simStatus, onOpenSettings }) {
  const cenario = simStatus?.cenario || 'luto';
  const dia = simStatus?.dia_simulado || 0;
  const vel = simStatus?.velocidade || 1440;
  const rodando = simStatus?.rodando;

  return (
    <header className="flex flex-col gap-3 w-full px-6 md:px-8 py-4 bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-30">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-4 min-w-0">
          <h2 className="font-display text-2xl font-bold text-primary md:hidden shrink-0">
            Hemera
          </h2>
          <div className="hidden md:flex gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                rodando
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              Cenário: {CENARIO_LABEL[cenario] || cenario}
            </span>
            <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold tracking-wide">
              Dia: {dia || '—'}
            </span>
            <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold tracking-wide">
              Velocidade: {vel}x
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-primary shrink-0">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              connected
                ? 'text-primary border-primary bg-surface-container'
                : 'text-error border-error bg-error-container'
            }`}
          >
            {connected ? '● CONECTADO' : '● DESCONECTADO'}
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
            aria-label="Configurações e simulação"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>
      <div className="flex md:hidden gap-2 flex-wrap">
        <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold tracking-wide">
          Cenário: {CENARIO_LABEL[cenario] || cenario}
        </span>
        <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold tracking-wide">
          Dia: {dia || '—'}
        </span>
        <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-semibold tracking-wide">
          Velocidade: {vel}x
        </span>
      </div>
      <ControlMetrics {...metrics} />
    </header>
  );
}
