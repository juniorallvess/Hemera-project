import { useEffect, useRef, useState } from 'react';

const ICONES_SENSOR = {
  presenca: 'sensors',
  fluxo_agua: 'water_drop',
  abertura_porta: 'door_open',
  decibel: 'mic',
  iluminancia: 'light_mode',
  temperatura: 'thermometer',
  umidade: 'humidity_percentage',
  consumo_energia: 'bolt',
};

const ICONES_DISP = {
  lampada: 'lightbulb',
  cortina: 'blinds',
  ar_condicionado: 'ac_unit',
  difusor_aroma: 'air_freshener',
  alto_falante: 'speaker',
  fechadura: 'lock',
  aquecedor: 'local_fire_department',
  geladeira: 'kitchen',
};

function formatarComodo(nome) {
  return (nome || '?')
    .replace(/^quarto_/, 'quarto de ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function AddItemPopup({ pos, tipos, comodos, onAdd, onCancel }) {
  const [categoria, setCategoria] = useState('sensor');
  const [tipoId, setTipoId] = useState('');
  const [comodoId, setComodoId] = useState('');
  const ref = useRef(null);

  const opcoesTipo = categoria === 'sensor' ? tipos.sensores : tipos.dispositivos;

  useEffect(() => {
    setTipoId(opcoesTipo[0]?.id ?? '');
  }, [categoria, opcoesTipo]);

  useEffect(() => {
    if (comodos.length && !comodoId) setComodoId(comodos[0].id);
  }, [comodos, comodoId]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onCancel();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onCancel]);

  const handleAdd = () => {
    if (!tipoId || !comodoId) return;
    onAdd({ categoria, tipoId: Number(tipoId), comodoId: Number(comodoId) });
  };

  const tipoSelecionado = opcoesTipo.find((t) => t.id === Number(tipoId));
  const icone =
    categoria === 'sensor'
      ? ICONES_SENSOR[tipoSelecionado?.codigo] ?? 'sensors'
      : ICONES_DISP[tipoSelecionado?.codigo] ?? 'device_unknown';

  return (
    <div
      ref={ref}
      className="absolute z-30 bg-surface-container-lowest border border-outline-variant/50 rounded-2xl shadow-xl p-4 w-64"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -108%)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-lg">{icone}</span>
        <span className="font-body text-sm font-bold text-on-surface">Adicionar item</span>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto p-1 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
        </button>
      </div>

      <div className="flex gap-1 mb-3 rounded-xl overflow-hidden border border-outline-variant/40">
        {['sensor', 'dispositivo'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoria(cat)}
            className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
              categoria === cat
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {cat === 'sensor' ? 'Sensor' : 'Dispositivo'}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-3">
        <label className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Tipo
        </label>
        <select
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value)}
          className="w-full text-xs rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2 text-on-surface focus:outline-none"
        >
          {opcoesTipo.map((t) => (
            <option key={t.id} value={t.id}>
              {t.descricao}
            </option>
          ))}
        </select>

        <label className="block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          Cômodo
        </label>
        <select
          value={comodoId}
          onChange={(e) => setComodoId(e.target.value)}
          className="w-full text-xs rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-2 text-on-surface focus:outline-none"
        >
          {comodos.map((c) => (
            <option key={c.id} value={c.id}>
              {formatarComodo(c.nome)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!tipoId || !comodoId}
        className="w-full py-2 rounded-xl bg-primary text-on-primary text-xs font-bold disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        Adicionar na planta
      </button>
    </div>
  );
}
