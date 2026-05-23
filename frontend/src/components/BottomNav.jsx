const ITEMS = [
  { id: 'q1-3', icon: 'query_stats', label: 'Q01–Q03', section: 'section-queries', query: 1 },
  { id: 'overview', icon: 'dashboard', label: 'Visão geral', section: 'section-planta', filled: true },
  { id: 'q10-12', icon: 'data_exploration', label: 'Q10–Q12', section: 'section-queries', query: 10 },
  { id: 'history', icon: 'history', label: 'Histórico', section: 'section-events' },
];

export default function BottomNav({ activeNav, onNavigate }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface-container-lowest/90 backdrop-blur-lg border-t border-outline-variant/40 shadow-[0_-2px_16px_rgba(58,48,42,0.04)] rounded-t-xl">
      {ITEMS.map((item) => {
        const active = activeNav === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id, item.section, item.query)}
            className={`flex flex-col items-center justify-center p-2 min-w-[4.5rem] transition-all active:scale-95 ${
              active
                ? 'bg-primary-container text-on-primary-container rounded-xl'
                : 'text-on-secondary-fixed-variant hover:bg-secondary-container/50'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={active && item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] uppercase tracking-widest mt-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
