import { LayoutDashboard, BarChart3, Cpu, History, Database, Edit3, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: 'Visão geral', section: 'section-planta' },
  { id: 'analytics', icon: BarChart3, label: 'Análises', section: 'section-queries' },
  { id: 'sensors', icon: Cpu, label: 'Sensores', section: 'section-planta' },
  { id: 'history', icon: History, label: 'Histórico', section: 'section-events' },
  { id: 'avancado', icon: Database, label: 'Avançado (BD)', section: 'section-queries' },
  { id: 'editor', icon: Edit3, label: 'Editor de Mapa', section: '' },
];

export default function SideNav({ activeNav, onNavigate, onLogout }) {
  return (
    <nav className="hidden md:flex flex-col h-screen py-6 bg-surface-container-low/90 backdrop-blur-xl text-on-surface w-64 fixed left-0 top-0 border-r border-outline-variant/40 z-40 shadow-[4px_0_24px_rgba(58,48,42,0.06)]">

      {/* Brand */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container/60 border border-outline-variant/30 shadow-sm">
          <img
            src="/static/logo.png"
            alt="Hemera Logo"
            className="w-12 h-12 object-contain animate-soft-pulse"
          />
          <div>
            <h1 className="font-display text-xl font-bold text-on-surface tracking-tight leading-tight">Hemera</h1>
            <p className="text-[10px] text-on-surface-variant font-medium tracking-widest uppercase mt-0.5">
              Inteligência Ambiental
            </p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <p className="px-6 text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.15em] mb-2">
        Navegação
      </p>

      {/* Nav items */}
      <ul className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id, item.section)}
                className={`relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group ${
                  active
                    ? 'bg-primary text-on-primary shadow-md shadow-primary/20 font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-on-primary/10'
                    : 'bg-surface-container-high/60 group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-body text-sm">{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-on-primary/60" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Divider + Logout */}
      <div className="px-3 mt-4 pt-4 border-t border-outline-variant/30">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left text-on-surface-variant hover:bg-error-container/30 hover:text-error group"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-container-high/60 group-hover:bg-error/10 transition-all duration-200">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="font-body text-sm font-medium">Sair</span>
        </button>
      </div>
    </nav>
  );
}
