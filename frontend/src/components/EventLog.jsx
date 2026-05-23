import { timelineDotClass } from '../utils/timeline';

export default function EventLog({ items }) {
  return (
    <aside
      id="section-events"
      className="xl:w-80 flex-shrink-0 bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 p-6 xl:sticky xl:top-24 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto scroll-mt-24"
    >
      <h3 className="font-headline text-xl text-on-surface mb-6 border-b border-outline-variant/30 pb-2">
        Registro de Eventos
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Aguardando eventos…</p>
      ) : (
        <div className="relative border-l border-outline-variant/50 ml-3 space-y-8 py-2">
          {items.map((item) => (
            <div key={item.id} className="relative pl-6">
              <div
                className={`absolute -left-1.5 top-1 w-3 h-3 rounded-full ${timelineDotClass(item.tipo)}`}
              />
              <p className="text-xs text-on-surface-variant font-bold mb-1">
                {item.hora}
              </p>
              <p className="text-sm text-on-surface font-medium">{item.descricao}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
