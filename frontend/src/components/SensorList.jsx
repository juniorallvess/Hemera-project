import { useState } from 'react';
import { useToast } from './Toast';

function nomeComodo(comodos, comodoId, fallback) {
  const c = comodos.find((x) => x.id === comodoId);
  return (c?.nome || fallback || '?').replace(/_/g, ' ');
}

function ItemRow({ item, comodos, onSave, onDelete }) {
  const [px, setPx] = useState(item.pos_x ?? 0);
  const [py, setPy] = useState(item.pos_y ?? 0);
  const [salvando, setSalvando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const { confirm } = useToast();

  const sujo =
    Number(px) !== Number(item.pos_x ?? 0) ||
    Number(py) !== Number(item.pos_y ?? 0);

  const salvar = async () => {
    setSalvando(true);
    await onSave(item.id, Number(px), Number(py));
    setSalvando(false);
  };

  const apagar = async () => {
    const aviso =
      item.kind === 'sensor'
        ? `Apagar sensor "${item.tipo_descricao || item.tipo}"? Todas as leituras associadas serão removidas.`
        : `Apagar dispositivo "${item.tipo_descricao || item.tipo}"?`;
    const confirmed = await confirm(aviso);
    if (!confirmed) return;
    setApagando(true);
    await onDelete(item.id);
    // componente desmontado após remoção — não repor flag
  };

  return (
    <tr className="border-b border-outline-variant/20">
      <td className="py-2 pr-3">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            item.kind === 'dispositivo' ? 'bg-tertiary' : 'bg-primary'
          }`}
        />
      </td>
      <td className="py-2 pr-3 text-on-surface font-medium whitespace-nowrap">
        {item.tipo_descricao || item.tipo}
      </td>
      <td className="py-2 pr-3 text-on-surface-variant whitespace-nowrap">
        {nomeComodo(comodos, item.comodo_id, item.comodo)}
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          value={px}
          onChange={(e) => setPx(e.target.value)}
          className="w-16 text-xs rounded-lg border border-outline-variant/40 bg-surface-container px-2 py-1 text-on-surface focus:outline-none"
        />
      </td>
      <td className="py-2 pr-3">
        <input
          type="number"
          value={py}
          onChange={(e) => setPy(e.target.value)}
          className="w-16 text-xs rounded-lg border border-outline-variant/40 bg-surface-container px-2 py-1 text-on-surface focus:outline-none"
        />
      </td>
      <td className="py-2 flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={!sujo || salvando}
          className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
        >
          {salvando ? '…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={apagar}
          disabled={apagando}
          className="px-3 py-1 rounded-lg bg-error text-on-error text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
        >
          {apagando ? '…' : 'Apagar'}
        </button>
      </td>
    </tr>
  );
}

function Tabela({ titulo, itens, comodos, onSave, onDelete }) {
  return (
    <div>
      <h4 className="font-body text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-3">
        {titulo} <span className="opacity-60">({itens.length})</span>
      </h4>
      {itens.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4">Nenhum item.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-on-surface-variant border-b border-outline-variant/30">
                <th className="pb-2 pr-3" />
                <th className="pb-2 pr-3 font-semibold">Tipo</th>
                <th className="pb-2 pr-3 font-semibold">Cômodo</th>
                <th className="pb-2 pr-2 font-semibold">X</th>
                <th className="pb-2 pr-3 font-semibold">Y</th>
                <th className="pb-2 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <ItemRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  comodos={comodos}
                  onSave={onSave}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SensorList({
  sensores,
  dispositivos,
  comodos,
  onSaveSensor,
  onSaveDispositivo,
  onDeleteSensor,
  onDeleteDispositivo,
  onOpenSettings,
}) {
  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 p-6 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-headline text-lg text-on-surface">
            Sensores e dispositivos
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Edite a posição (X, Y) e guarde. Apagar um sensor remove também todas as suas leituras.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant text-sm font-bold hover:bg-secondary-container/50 transition-colors"
        >
          <span className="material-symbols-outlined text-base">settings</span>
          Configurações
        </button>
      </div>

      <Tabela
        titulo="Sensores"
        itens={sensores}
        comodos={comodos}
        onSave={onSaveSensor}
        onDelete={onDeleteSensor}
      />
      <Tabela
        titulo="Dispositivos"
        itens={dispositivos}
        comodos={comodos}
        onSave={onSaveDispositivo}
        onDelete={onDeleteDispositivo}
      />
    </section>
  );
}
