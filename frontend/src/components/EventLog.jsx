import { Clock, Activity, Radio } from 'lucide-react';
import { timelineDotClass } from '../utils/timeline';

export default function EventLog({ items, full = false }) {
  const hasEvents = items.length > 0;

  return (
    <aside
      id="section-events"
      className={`${
        full
          ? 'w-full'
          : 'xl:w-80 flex-shrink-0 xl:sticky xl:top-24'
      } bg-surface-container-lowest rounded-2xl shadow-[0_4px_32px_rgba(194,101,42,0.08)] border border-outline-variant/30 overflow-hidden h-fit max-h-[calc(100vh-8rem)] scroll-mt-24 transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 sticky top-0 bg-surface-container-lowest z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-headline text-base font-semibold text-on-surface">
            Eventos em tempo real
          </h3>
        </div>

        {/* Live badge */}
        {hasEvents ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
            <Radio className="w-3 h-3 animate-pulse" />
            Ao vivo
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/30" />
            Aguardando
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {!hasEvents ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center">
              <Clock className="w-7 h-7 text-on-surface-variant opacity-40" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium">Aguardando eventos…</p>
            <p className="text-xs text-on-surface-variant/50">Os eventos aparecerão aqui em tempo real</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-outline-variant/40 ml-3 space-y-5 py-1">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="relative pl-5 animate-in fade-in slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[9px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest ${timelineDotClass(item.tipo)} transition-transform hover:scale-125`}
                />
                <p className="text-[10px] text-on-surface-variant/60 font-bold mb-1 uppercase tracking-wider">
                  {item.hora}
                </p>
                <p className="text-sm text-on-surface font-medium leading-relaxed">{item.descricao}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
