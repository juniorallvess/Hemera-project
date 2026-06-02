import { useCallback, useEffect, useState } from 'react';

const LABEL_PERFIL = {
  adulto_pleno: 'Adulto pleno',
  home_office: 'Home office',
  jovem_adulto: 'Jovem adulto',
  idoso: 'Idoso',
  crianca: 'Criança',
};

export default function MoradorList() {
  const [moradores, setMoradores] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({ nome: '', perfil: '', data_nascimento: '' });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/moradores'),
        fetch('/api/moradores/perfis'),
      ]);
      if (mRes.ok) setMoradores(await mRes.json());
      if (pRes.ok) {
        const lista = await pRes.json();
        setPerfis(lista);
        setForm((f) => ({ ...f, perfil: f.perfil || lista[0] || '' }));
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim() || !form.perfil || !form.data_nascimento) {
      setErro('Preencha todos os campos.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/moradores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErro(d.detail || `Erro ${res.status}`);
        return;
      }
      const novo = await res.json();
      setMoradores((prev) => [...prev, novo]);
      setForm((f) => ({ nome: '', perfil: f.perfil, data_nascimento: '' }));
    } finally {
      setEnviando(false);
    }
  };

  const remover = async (id, nome) => {
    if (!window.confirm(`Remover morador "${nome}"? Todos os dados associados serão apagados.`)) return;
    const res = await fetch(`/api/moradores/${id}`, { method: 'DELETE' });
    if (res.ok) setMoradores((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 p-6 space-y-6">
      <div>
        <h3 className="font-headline text-lg text-on-surface">Moradores</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Gerir residentes. Novos moradores aparecem na lista imediatamente; a
          animação na planta requer reinício do simulador.
        </p>
      </div>

      {/* Formulário de adição */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-1">
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nome</label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Nome completo"
            className="w-full text-sm rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2 text-on-surface focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Perfil</label>
          <select
            value={form.perfil}
            onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
            className="w-full text-sm rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2 text-on-surface focus:outline-none"
          >
            {perfis.map((p) => (
              <option key={p} value={p}>{LABEL_PERFIL[p] || p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">Data de nascimento</label>
          <input
            type="date"
            value={form.data_nascimento}
            onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
            className="w-full text-sm rounded-lg border border-outline-variant/40 bg-surface-container px-3 py-2 text-on-surface focus:outline-none"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
          >
            {enviando ? '…' : 'Adicionar'}
          </button>
        </div>
        {erro && (
          <p className="sm:col-span-4 text-xs text-error">{erro}</p>
        )}
      </form>

      {/* Lista de moradores */}
      <div>
        <h4 className="font-body text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-3">
          Residentes <span className="opacity-60">({moradores.length})</span>
        </h4>
        {carregando ? (
          <p className="text-sm text-on-surface-variant py-4">A carregar…</p>
        ) : moradores.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-4">Nenhum morador cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline-variant/30">
                  <th className="pb-2 pr-4 font-semibold">Nome</th>
                  <th className="pb-2 pr-4 font-semibold">Perfil</th>
                  <th className="pb-2 pr-4 font-semibold">Nascimento</th>
                  <th className="pb-2 pr-4 font-semibold">Residência</th>
                  <th className="pb-2 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {moradores.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/20">
                    <td className="py-2 pr-4 text-on-surface font-medium">{m.nome}</td>
                    <td className="py-2 pr-4 text-on-surface-variant">
                      {LABEL_PERFIL[m.perfil] || m.perfil}
                    </td>
                    <td className="py-2 pr-4 text-on-surface-variant">{m.data_nascimento}</td>
                    <td className="py-2 pr-4 text-on-surface-variant">{m.residencia}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => remover(m.id, m.nome)}
                        className="px-3 py-1 rounded-lg bg-error text-on-error text-xs font-bold transition-all active:scale-95"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
