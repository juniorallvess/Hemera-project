import { useState } from 'react';
import Busca from './Busca';
import Modelagem from './Modelagem';
import QueryPanel from './QueryPanel';

export default function AvancadoPanel({ activeQuery, loading, error, result, onSelectQuery }) {
  const [aba, setAba] = useState('consultas');

  const btnCls = (id) =>
    `py-2 px-4 rounded-lg text-sm font-medium transition-all active:scale-95 ${
      aba === id
        ? 'bg-primary-container text-on-primary-container'
        : 'bg-surface-container hover:bg-secondary-container/50 text-on-surface-variant'
    }`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button type="button" className={btnCls('consultas')} onClick={() => setAba('consultas')}>
          Consultas
        </button>
        <button type="button" className={btnCls('modelagem')} onClick={() => setAba('modelagem')}>
          Modelagem
        </button>
        <button type="button" className={btnCls('busca')} onClick={() => setAba('busca')}>
          Busca
        </button>
      </div>
      {aba === 'consultas' && (
        <QueryPanel
          activeQuery={activeQuery}
          loading={loading}
          error={error}
          result={result}
          onSelectQuery={onSelectQuery}
        />
      )}
      {aba === 'modelagem' && <Modelagem />}
      {aba === 'busca' && <Busca />}
    </div>
  );
}
