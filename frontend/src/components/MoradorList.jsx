import { useCallback, useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Loader2, User } from 'lucide-react';
import { useToast } from './Toast';

const LABEL_PERFIL = {
  adulto_pleno: 'Adulto pleno',
  home_office: 'Home office',
  jovem_adulto: 'Jovem adulto',
  idoso: 'Idoso',
  crianca: 'Criança',
};

// Color per profile type
const PERFIL_STYLE = {
  adulto_pleno: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', avatar: 'bg-primary text-on-primary' },
  home_office:  { bg: 'bg-amber-50',   text: 'text-amber-700', border: 'border-amber-200', avatar: 'bg-amber-500 text-white' },
  jovem_adulto: { bg: 'bg-sky-50',     text: 'text-sky-700',   border: 'border-sky-200',   avatar: 'bg-sky-500 text-white' },
  idoso:        { bg: 'bg-tertiary/8', text: 'text-tertiary',  border: 'border-tertiary/20', avatar: 'bg-tertiary text-on-tertiary' },
  crianca:      { bg: 'bg-pink-50',    text: 'text-pink-700',  border: 'border-pink-200',  avatar: 'bg-pink-400 text-white' },
};

const DEFAULT_STYLE = { bg: 'bg-surface-container', text: 'text-on-surface-variant', border: 'border-outline-variant/30', avatar: 'bg-secondary text-on-secondary' };

function getInitials(nome = '') {
  return nome.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function MoradorList() {
  const [moradores, setMoradores] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({ nome: '', perfil: '', data_nascimento: '' });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const { confirm } = useToast();

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
    const confirmed = await confirm(`Remover morador "${nome}"? Todos os dados associados serão apagados.`);
    if (!confirmed) return;
    const res = await fetch(`/api/moradores/${id}`, { method: 'DELETE' });
    if (res.ok) setMoradores((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <section className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_32px_rgba(194,101,42,0.08)] border border-outline-variant/30 overflow-hidden transition-all duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-headline text-base font-semibold text-on-surface">Moradores</h3>
            <p className="text-[11px] text-on-surface-variant font-medium">
              Novos moradores aparecem na lista imediatamente
            </p>
          </div>
        </div>
        <span className="flex items-center justify-center min-w-[2rem] h-8 px-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface-variant tabular-nums">
          {moradores.length}
        </span>
      </div>

      <div className="p-5 space-y-6">
        {/* Add form */}
        <form onSubmit={handleSubmit} className="bg-surface-container/50 rounded-xl border border-outline-variant/30 p-4 space-y-3">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Adicionar morador</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo"
                className="w-full text-sm rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Perfil</label>
              <select
                value={form.perfil}
                onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                className="w-full text-sm rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {perfis.map((p) => (
                  <option key={p} value={p}>{LABEL_PERFIL[p] || p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Data de nascimento</label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                className="w-full text-sm rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={enviando}
                className="w-full px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold disabled:opacity-40 transition-all duration-200 hover:bg-primary/90 active:scale-95 flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
              >
                {enviando ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Adicionando…</span></>
                ) : (
                  <><UserPlus className="w-4 h-4" /><span>Adicionar</span></>
                )}
              </button>
            </div>
          </div>
          {erro && (
            <p className="text-xs text-error font-medium flex items-center gap-1.5 bg-error-container/50 px-3 py-2 rounded-lg border border-error/20">
              <span>⚠</span> {erro}
            </p>
          )}
        </form>

        {/* Residents list */}
        <div>
          <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-[0.12em] mb-3">
            Residentes
          </p>

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando…</span>
            </div>
          ) : moradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center">
                <User className="w-7 h-7 text-on-surface-variant opacity-30" />
              </div>
              <p className="text-sm text-on-surface-variant font-medium">Nenhum morador cadastrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {moradores.map((m, idx) => {
                const style = PERFIL_STYLE[m.perfil] || DEFAULT_STYLE;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border ${style.bg} ${style.border} transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Avatar */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm shrink-0 ${style.avatar}`}>
                      {getInitials(m.nome)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{m.nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                          {LABEL_PERFIL[m.perfil] || m.perfil}
                        </span>
                        <span className="text-on-surface-variant/30 text-[10px]">·</span>
                        <span className="text-[10px] text-on-surface-variant/60">{m.data_nascimento}</span>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => remover(m.id, m.nome)}
                      className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant/40 hover:text-error transition-all duration-200 shrink-0"
                      title={`Remover ${m.nome}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
