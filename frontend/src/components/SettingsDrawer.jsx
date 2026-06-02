export default function SettingsDrawer({
  open,
  onClose,
  simStatus,
  simLoading,
  onIniciarAoVivo,
  onIniciarBatch,
  onPararSim,
  editMode,
  onToggleEdit,
  onUploadPlanta,
  plantaFonte,
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-on-background/40 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/40 z-50 shadow-xl flex flex-col"
        role="dialog"
        aria-label="Configurações"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline text-xl text-on-surface">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="font-body text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-3">
              Planta da casa
            </h3>
            <p className="text-sm text-on-surface-variant mb-3">
              Fonte atual:{' '}
              <strong>
                {plantaFonte === 'personalizada' ? 'SVG personalizado' : 'Planta padrão Hemera'}
              </strong>
            </p>
            <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/40 cursor-pointer hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-primary">upload</span>
              <span className="text-sm font-medium">Importar planta (.svg)</span>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadPlanta(f);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              onClick={onToggleEdit}
              className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                editMode
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container/50'
              }`}
            >
              {editMode ? 'Sair do modo edição' : 'Editar sensores e dispositivos'}
            </button>
            {editMode && (
              <p className="mt-2 text-xs text-on-surface-variant">
                Arraste sensores e dispositivos na planta. As posições são guardadas automaticamente.
              </p>
            )}
          </section>

          <section>
            <h3 className="font-body text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-3">
              Simulação
            </h3>
            <p className="text-sm text-on-surface-variant mb-4">
              {simStatus.rodando
                ? `A correr (${simStatus.modo === 'ao_vivo' ? 'ao vivo' : 'batch'}) — dia ${simStatus.dia_simulado || 1}`
                : 'Parada. Inicie para ver moradores, sensores e dispositivos na planta.'}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                disabled={simLoading || simStatus.rodando}
                onClick={onIniciarAoVivo}
                className="py-2.5 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold disabled:opacity-50"
              >
                Demo ao vivo
              </button>
              <button
                type="button"
                disabled={simLoading || simStatus.rodando}
                onClick={onIniciarBatch}
                className="py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold disabled:opacity-50 hover:bg-secondary-container/50"
              >
                Batch 30 dias
              </button>
            </div>
            {simStatus.rodando && (
              <button
                type="button"
                disabled={simLoading}
                onClick={onPararSim}
                className="w-full py-2.5 rounded-xl bg-error-container text-on-error-container text-sm font-bold"
              >
                Parar simulação
              </button>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
