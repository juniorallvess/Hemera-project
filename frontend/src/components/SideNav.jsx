const NAV_ITEMS = [
  { id: 'overview', icon: 'dashboard', label: 'Visão geral', section: 'section-planta', filled: true },
  { id: 'analytics', icon: 'analytics', label: 'Análises', section: 'section-queries' },
  { id: 'sensors', icon: 'sensors', label: 'Sensores', section: 'section-planta' },
  { id: 'history', icon: 'history', label: 'Histórico', section: 'section-events' },
  { id: 'avancado', icon: 'storage', label: 'Avançado (BD)', section: 'section-queries' },
  { id: 'editor', icon: 'edit_square', label: 'Editor de Mapa', section: '' },
];

export default function SideNav({ activeNav, onNavigate }) {
  return (
    <nav className="hidden md:flex flex-col h-screen py-8 bg-surface-container-low text-on-surface w-64 fixed left-0 top-0 border-r border-outline-variant/60 z-40">
      <div className="px-8 mb-8">
        <h1 className="font-display text-xl text-on-surface">Hemera</h1>
        <p className="text-xs text-on-surface-variant mt-1">Inteligência Ambiental</p>
      </div>
      <ul className="flex-1 space-y-2 px-4">
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id, item.section)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  active
                    ? 'text-primary font-bold border-r-4 border-primary bg-surface-container'
                    : 'text-on-secondary-container opacity-70 hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={active && item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-body text-sm font-medium">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
