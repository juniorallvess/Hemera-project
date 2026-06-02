import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';

mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });

async function renderMermaid(containerEl, id, definition) {
  try {
    const { svg } = await mermaid.render(id, definition);
    containerEl.innerHTML = svg;
  } catch (e) {
    containerEl.innerHTML = `<pre style="color:#b91c1c">Erro ao renderizar: ${e.message}</pre>`;
  }
}

const ER_LOGICO = `erDiagram
  RESIDENCIAS ||--o{ MORADORES : "habita"
  RESIDENCIAS ||--o{ COMODOS : "possui"
  COMODOS ||--o{ SENSORES : "contem"
  COMODOS ||--o{ DISPOSITIVOS : "contem"
  SENSORES ||--o{ LEITURAS : "gera"
  MORADORES ||--o{ PADROES_COMPORTAMENTAIS : "tem"
  MORADORES ||--o{ BASELINES : "tem"
  MORADORES ||--o{ DESVIOS_DETECTADOS : "gera"
  BASELINES ||--o{ DESVIOS_DETECTADOS : "referencia"
  DESVIOS_DETECTADOS ||--o{ INTERVENCOES : "dispara"
  CENAS ||--o{ INTERVENCOES : "aplica"
  INTERVENCOES ||--o{ ACIONAMENTOS : "gera"
  INTERVENCOES ||--o{ REACOES : "recebe"
  MORADORES ||--o{ APRENDIZADO_PESOS : "tem"
  CENAS ||--o{ APRENDIZADO_PESOS : "pondera"
  MORADORES ||--o{ BLOQUEIOS_TEMPORARIOS : "tem"
  CENAS ||--o{ BLOQUEIOS_TEMPORARIOS : "bloqueia"
  MORADORES ||--o{ AGENDAMENTOS_SUTIS : "tem"
  CENAS ||--o{ AGENDAMENTOS_SUTIS : "agenda"
  CENAS ||--o{ CENA_DISPOSITIVO : "configura"
  CATALOGOS ||--o{ SENSORES : "classifica"
  CATALOGOS ||--o{ DISPOSITIVOS : "classifica"
  CATALOGOS ||--o{ CENA_DISPOSITIVO : "referencia"
  CATALOGOS {
    string tipos_sensor
    string tipos_dispositivo
    string protocolos
    string acoes_dispositivo
  }
`;

const ER_RELACIONAL = `erDiagram
  RESIDENCIAS {
    int id PK
    string nome
    string endereco
    string data_instalacao
  }
  MORADORES {
    int id PK
    int residencia_id FK
    string nome
    string data_nascimento
    string perfil
  }
  COMODOS {
    int id PK
    int residencia_id FK
    string nome
    string tipo
    float area_m2
  }
  TIPOS_SENSOR {
    int id PK
    string codigo
    string descricao
    string unidade_medida
  }
  TIPOS_DISPOSITIVO {
    int id PK
    string codigo
    string descricao
  }
  PROTOCOLOS {
    int id PK
    string codigo
    string descricao
  }
  ACOES_DISPOSITIVO {
    int id PK
    string codigo
    string descricao
  }
  SENSORES {
    int id PK
    int comodo_id FK
    int tipo_sensor_id FK
    int protocolo_id FK
    string fabricante
    int ativo
  }
  DISPOSITIVOS {
    int id PK
    int comodo_id FK
    int tipo_dispositivo_id FK
    int protocolo_id FK
    string fabricante
    int ativo
  }
  LEITURAS {
    int id PK
    int sensor_id FK
    float valor
    string registrado_em
  }
  PADROES_COMPORTAMENTAIS {
    int id PK
    int morador_id FK
    int comodo_id FK
    string janela_inicio
    string janela_fim
    string metrica
    float valor
  }
  BASELINES {
    int id PK
    int morador_id FK
    int comodo_id FK
    string metrica
    int hora
    float valor_medio
    float desvio_padrao
    string calculado_em
  }
  DESVIOS_DETECTADOS {
    int id PK
    int morador_id FK
    int comodo_id FK
    int baseline_id FK
    float intensidade
    string detectado_em
  }
  CENAS {
    int id PK
    string nome
    string descricao
    int ativa
  }
  CENA_DISPOSITIVO {
    int id PK
    int cena_id FK
    int tipo_dispositivo_id FK
    int acao_id FK
    float intensidade
    int duracao_segundos
  }
  INTERVENCOES {
    int id PK
    int desvio_id FK
    int cena_id FK
    int morador_id FK
    int comodo_id FK
    string executada_em
    string status
  }
  ACIONAMENTOS {
    int id PK
    int intervencao_id FK
    int dispositivo_id FK
    int acao_id FK
    float intensidade
    string acionado_em
  }
  REACOES {
    int id PK
    int intervencao_id FK
    string tipo_reacao
    string registrada_em
  }
  APRENDIZADO_PESOS {
    int id PK
    int morador_id FK
    int cena_id FK
    float peso
    string atualizado_em
  }
  BLOQUEIOS_TEMPORARIOS {
    int id PK
    int morador_id FK
    int cena_id FK
    string ate
  }
  AGENDAMENTOS_SUTIS {
    int id PK
    int morador_id FK
    int cena_id FK
    int dia_semana
    string horario
    int ativo
  }
  RESIDENCIAS ||--o{ MORADORES : "habita"
  RESIDENCIAS ||--o{ COMODOS : "possui"
  COMODOS ||--o{ SENSORES : "contem"
  COMODOS ||--o{ DISPOSITIVOS : "contem"
  TIPOS_SENSOR ||--o{ SENSORES : "classifica"
  TIPOS_DISPOSITIVO ||--o{ DISPOSITIVOS : "classifica"
  PROTOCOLOS ||--o{ SENSORES : "usa"
  PROTOCOLOS ||--o{ DISPOSITIVOS : "usa"
  SENSORES ||--o{ LEITURAS : "gera"
  MORADORES ||--o{ PADROES_COMPORTAMENTAIS : "tem"
  COMODOS ||--o{ PADROES_COMPORTAMENTAIS : "referencia"
  MORADORES ||--o{ BASELINES : "tem"
  COMODOS ||--o{ BASELINES : "referencia"
  BASELINES ||--o{ DESVIOS_DETECTADOS : "referencia"
  MORADORES ||--o{ DESVIOS_DETECTADOS : "gera"
  COMODOS ||--o{ DESVIOS_DETECTADOS : "em"
  CENAS ||--o{ CENA_DISPOSITIVO : "configura"
  TIPOS_DISPOSITIVO ||--o{ CENA_DISPOSITIVO : "referencia"
  ACOES_DISPOSITIVO ||--o{ CENA_DISPOSITIVO : "define"
  DESVIOS_DETECTADOS ||--o{ INTERVENCOES : "dispara"
  CENAS ||--o{ INTERVENCOES : "aplica"
  MORADORES ||--o{ INTERVENCOES : "recebe"
  COMODOS ||--o{ INTERVENCOES : "em"
  INTERVENCOES ||--o{ ACIONAMENTOS : "gera"
  DISPOSITIVOS ||--o{ ACIONAMENTOS : "executa"
  ACOES_DISPOSITIVO ||--o{ ACIONAMENTOS : "define"
  INTERVENCOES ||--o{ REACOES : "recebe"
  MORADORES ||--o{ APRENDIZADO_PESOS : "tem"
  CENAS ||--o{ APRENDIZADO_PESOS : "pondera"
  MORADORES ||--o{ BLOQUEIOS_TEMPORARIOS : "tem"
  CENAS ||--o{ BLOQUEIOS_TEMPORARIOS : "bloqueia"
  MORADORES ||--o{ AGENDAMENTOS_SUTIS : "tem"
  CENAS ||--o{ AGENDAMENTOS_SUTIS : "agenda"
`;

export default function Modelagem() {
  const [aba, setAba] = useState('logico');
  const [ddl, setDdl] = useState('');
  const [ddlError, setDdlError] = useState('');
  const [copiado, setCopiado] = useState(false);
  const refLogico = useRef(null);
  const refRelacional = useRef(null);

  useEffect(() => {
    fetch('/api/modelo/ddl')
      .then((r) => r.json())
      .then((d) => setDdl(d.ddl))
      .catch(() => setDdlError('Falha ao carregar DDL'));
  }, []);

  useEffect(() => {
    if (aba === 'logico' && refLogico.current) {
      renderMermaid(refLogico.current, 'mmd-logico', ER_LOGICO);
    } else if (aba === 'relacional' && refRelacional.current) {
      renderMermaid(refRelacional.current, 'mmd-relacional', ER_RELACIONAL);
    }
  }, [aba]);

  const copiar = () => {
    navigator.clipboard.writeText(ddl).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const btnCls = (id) =>
    `py-1.5 px-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${
      aba === id
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-surface-container hover:bg-secondary-container/50 text-on-surface-variant'
    }`;

  return (
    <section
      id="section-modelagem"
      className="bg-surface-container-lowest rounded-xl shadow-[0_2px_16px_rgba(58,48,42,0.04)] border border-outline-variant/30 p-6 scroll-mt-24"
    >
      <h3 className="font-headline text-lg text-on-surface mb-4">Modelagem do Banco de Dados</h3>
      <div className="flex gap-2 mb-6">
        <button type="button" className={btnCls('logico')} onClick={() => setAba('logico')}>
          Lógico
        </button>
        <button type="button" className={btnCls('relacional')} onClick={() => setAba('relacional')}>
          Relacional
        </button>
        <button type="button" className={btnCls('fisico')} onClick={() => setAba('fisico')}>
          Físico
        </button>
      </div>

      {aba === 'logico' && (
        <div
          className="overflow-auto max-h-[70vh] border border-outline-variant/20 rounded-lg p-2 bg-surface"
          ref={refLogico}
        />
      )}

      {aba === 'relacional' && (
        <div
          className="overflow-auto max-h-[70vh] border border-outline-variant/20 rounded-lg p-2 bg-surface"
          ref={refRelacional}
        />
      )}

      {aba === 'fisico' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={copiar}
              className="py-1.5 px-4 rounded-lg text-xs font-medium bg-surface-container hover:bg-secondary-container/50 text-on-surface-variant transition-all active:scale-95"
            >
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          {ddlError ? (
            <p className="text-error text-sm py-4 text-center">{ddlError}</p>
          ) : (
            <pre className="overflow-auto max-h-[65vh] rounded-lg bg-surface border border-outline-variant/20 p-4 text-xs text-on-surface-variant font-mono leading-relaxed">
              <code>{ddl || 'Carregando…'}</code>
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
