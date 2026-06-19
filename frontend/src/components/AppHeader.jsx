import { Settings, Wifi, WifiOff, LogOut, Flame, Calendar, Gauge } from 'lucide-react';
import ControlMetrics from './ControlMetrics';

const CENARIO_LABEL = {
  normal: 'Normal',
  luto: 'Luto',
  insonia: 'Insônia',
  celebracao: 'Celebração',
};

function StatusChip({ icon: Icon, label, value, active }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-300 ${
      active
        ? 'bg-primary-container/40 text-on-primary-container border-primary/20 shadow-sm'
        : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
    }`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-on-surface-variant/70 font-medium">{label}</span>
      <span className="font-bold text-on-surface">{value || '—'}</span>
    </div>
  );
}

export default function AppHeader({ connected, metrics, simStatus, onOpenSettings, onLogout }) {
  const cenario = simStatus?.cenario || 'luto';
  const dia = simStatus?.dia_simulado || 0;
  const vel = simStatus?.velocidade || 1440;
  const rodando = simStatus?.rodando;

  return (
    <header className="flex flex-col gap-3 w-full px-6 md:px-8 py-4 bg-background/95 backdrop-blur-lg border-b border-outline-variant/30 sticky top-0 z-30 transition-all duration-300 shadow-[0_2px_16px_rgba(58,48,42,0.06)]">
      <div className="flex justify-between items-center w-full">

        {/* Left: mobile brand + desktop chips */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden shrink-0">
            <img src="/static/logo.png" alt="Hemera Logo" className="w-9 h-9 object-contain animate-soft-pulse" />
            <h2 className="font-display text-xl font-bold text-primary">Hemera</h2>
          </div>

          {/* Desktop chips */}
          <div className="hidden md:flex gap-2 flex-wrap items-center">
            <StatusChip icon={Flame} label="Cenário:" value={CENARIO_LABEL[cenario] || cenario} active={rodando} />
            <StatusChip icon={Calendar} label="Dia:" value={dia} />
            <StatusChip icon={Gauge} label="Velocidade:" value={`${vel}x`} />
          </div>
        </div>

        {/* Right: connection + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Connection badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 ${
            connected
              ? 'text-primary border-primary/30 bg-primary/6 shadow-sm'
              : 'text-error border-error/30 bg-error/6 shadow-sm'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-primary animate-pulse' : 'bg-error'}`} />
            {connected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CONECTADO</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">DESCONECTADO</span>
              </>
            )}
          </div>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 hover:bg-surface-container rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-transparent hover:border-outline-variant/30"
            aria-label="Configurações e simulação"
          >
            <Settings className="w-4.5 h-4.5 text-primary" style={{ width: '1.125rem', height: '1.125rem' }} />
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 hover:bg-error-container/20 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-transparent hover:border-error/20"
            aria-label="Sair do sistema"
          >
            <LogOut className="w-4.5 h-4.5 text-error" style={{ width: '1.125rem', height: '1.125rem' }} />
          </button>
        </div>
      </div>

      {/* Mobile chips */}
      <div className="flex md:hidden gap-2 flex-wrap">
        <StatusChip icon={Flame} label="Cenário:" value={CENARIO_LABEL[cenario] || cenario} active={rodando} />
        <StatusChip icon={Calendar} label="Dia:" value={dia} />
        <StatusChip icon={Gauge} label="Velocidade:" value={`${vel}x`} />
      </div>

      <ControlMetrics {...metrics} />
    </header>
  );
}
