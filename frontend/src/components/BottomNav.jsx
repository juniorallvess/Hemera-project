import { LayoutDashboard, Cpu, Database, History, Edit3 } from 'lucide-react';

const ITEMS = [
  { id: 'overview', icon: LayoutDashboard, label: 'Visão geral', section: 'section-planta' },
  { id: 'sensors', icon: Cpu, label: 'Sensores', section: 'section-planta' },
  { id: 'avancado', icon: Database, label: 'Avançado', section: 'section-queries' },
  { id: 'history', icon: History, label: 'Histórico', section: 'section-events' },
  { id: 'editor', icon: Edit3, label: 'Editor', section: '' },
];

export default function BottomNav({ activeNav, onNavigate }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant/40 shadow-[0_-4px_20px_rgba(58,48,42,0.08)] rounded-t-2xl">
      {ITEMS.map((item) => {
        const active = activeNav === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id, item.section, item.query)}
            className={`flex flex-col items-center justify-center p-2.5 min-w-[4.5rem] transition-all duration-200 active:scale-95 group ${
              active
                ? 'bg-primary-container text-on-primary-container rounded-xl shadow-sm'
                : 'text-on-secondary-fixed-variant hover:bg-secondary-container/50'
            }`}
          >
            <Icon className={`w-5 h-5 transition-all duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
            <span className="font-label text-[10px] uppercase tracking-widest mt-1 font-medium">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
