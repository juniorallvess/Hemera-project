export const MAX_TIMELINE_ITEMS = 60;

export function formatTimelineItem(msg) {
  const tipo = msg.tipo || 'evento';
  const ts =
    msg.executada_em ||
    msg.detectado_em ||
    msg.registrado_em ||
    new Date().toISOString();
  const hora =
    ts.split('T').pop()?.slice(0, 8) || ts.slice(11, 19) || '—';

  let descricao = '';
  if (tipo === 'intervencao') {
    descricao = `Intervenção #${msg.intervencao_id} • cena ${msg.cena_id} • cômodo ${msg.comodo_id}`;
  } else if (tipo === 'desvio') {
    descricao = `Desvio σ=${(msg.intensidade || 0).toFixed(1)} • morador ${msg.morador_id}`;
  } else if (tipo === 'leitura') {
    descricao = `${msg.sensor_tipo || 'sensor'} = ${(msg.valor || 0).toFixed(2)} @ ${msg.comodo || '?'}`;
  } else if (tipo === 'morador_movimento') {
    descricao = `Morador ${msg.morador_id} → ${msg.comodo || '?'}`;
  } else if (tipo === 'comodo_estado') {
    descricao = `${msg.comodo || 'cômodo'} ${msg.ocupado ? 'ocupado' : 'vazio'} • ${msg.presentes ?? 0} presente(s)`;
  } else {
    descricao = JSON.stringify(msg).slice(0, 80);
  }

  return { id: `${ts}-${Math.random()}`, tipo, hora, descricao };
}

export function timelineDotClass(tipo) {
  if (tipo === 'desvio') return 'bg-tertiary';
  if (tipo === 'intervencao') return 'bg-primary-container border-2 border-primary';
  if (tipo === 'leitura') return 'bg-primary';
  if (tipo === 'morador_movimento') return 'bg-secondary';
  if (tipo === 'comodo_estado') return 'bg-surface-container-high border-2 border-secondary';
  return 'bg-surface-variant border-2 border-primary';
}
