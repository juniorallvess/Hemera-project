import { useCallback, useState } from 'react';
import AnalisesPanel from './components/AnalisesPanel';
import MapaEditor from './components/MapaEditor';
import AppHeader from './components/AppHeader';
import BlueprintCard from './components/BlueprintCard';
import BottomNav from './components/BottomNav';
import EventLog from './components/EventLog';
import MoradorList from './components/MoradorList';
import AvancadoPanel from './components/AvancadoPanel';
import SensorList from './components/SensorList';
import SettingsDrawer from './components/SettingsDrawer';
import SideNav from './components/SideNav';
import { useCounters } from './hooks/useCounters';
import { usePlanta } from './hooks/usePlanta';
import { useQueries } from './hooks/useQueries';
import { useSensorLayout } from './hooks/useSensorLayout';
import { useSimulator } from './hooks/useSimulator';
import { useWebSocket } from './hooks/useWebSocket';
import { scrollToSection } from './utils/navigation';
import {
  MAX_TIMELINE_ITEMS,
  formatTimelineItem,
} from './utils/timeline';

export default function App() {
  const [timelineItems, setTimelineItems] = useState([]);
  const [activeNav, setActiveNav] = useState('overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [plantaReload, setPlantaReload] = useState(0);

  const { onPlantaReady, aplicarLayout, adicionarItem, atualizarPlanta } = usePlanta();
  const {
    layout,
    dispositivosLayout,
    plantaInfo,
    tipos,
    comodos,
    salvarPosicao,
    salvarPosicaoDispositivo,
    criarSensor,
    criarDispositivo,
    deletarSensor,
    deletarDispositivo,
    uploadPlanta,
  } = useSensorLayout();
  const { status: simStatus, loading: simLoading, iniciar, parar } = useSimulator();
  const {
    leituras,
    desvios,
    intervencoes,
    ultimaAtualizacao,
    atualizarControle,
  } = useCounters();
  const { activeQuery, loading, error, result, executarQuery } = useQueries();

  const activeView = activeNav;

  const handleNavigate = useCallback(
    (navId, sectionId, queryNum) => {
      setActiveNav(navId);
      scrollToSection(sectionId);
      if (queryNum) executarQuery(queryNum);
    },
    [executarQuery],
  );

  const handleWsMessage = useCallback(
    (msg) => {
      setTimelineItems((prev) => {
        const next = [formatTimelineItem(msg), ...prev];
        return next.slice(0, MAX_TIMELINE_ITEMS);
      });
      atualizarPlanta(msg);
      atualizarControle(msg);
    },
    [atualizarPlanta, atualizarControle],
  );

  const { connected } = useWebSocket(handleWsMessage);

  const handleSensorMove = useCallback(
    (sensorId, x, y) => salvarPosicao(sensorId, x, y),
    [salvarPosicao],
  );

  const handleDispositivoMove = useCallback(
    (dispId, x, y) => salvarPosicaoDispositivo(dispId, x, y),
    [salvarPosicaoDispositivo],
  );

  const handleDeleteSensor = useCallback(
    (id) => deletarSensor(id),
    [deletarSensor],
  );

  const handleDeleteDispositivo = useCallback(
    (id) => deletarDispositivo(id),
    [deletarDispositivo],
  );

  const handleAddItem = useCallback(
    async ({ categoria, tipoId, comodoId, pos_x, pos_y }) => {
      let novo;
      if (categoria === 'sensor') {
        novo = await criarSensor(tipoId, comodoId, pos_x, pos_y);
      } else {
        novo = await criarDispositivo(tipoId, comodoId, pos_x, pos_y);
      }
      if (novo) adicionarItem(novo);
    },
    [criarSensor, criarDispositivo, adicionarItem],
  );

  const handleUploadPlanta = useCallback(
    async (file) => {
      const ok = await uploadPlanta(file);
      if (ok) {
        setPlantaReload((n) => n + 1);
        setSettingsOpen(false);
      }
    },
    [uploadPlanta],
  );

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col md:flex-row antialiased">
      <SideNav activeNav={activeNav} onNavigate={handleNavigate} />
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen pb-24 md:pb-0">
        <AppHeader
          connected={connected}
          metrics={{ leituras, desvios, intervencoes, ultimaAtualizacao }}
          simStatus={simStatus}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="flex-1 p-6 lg:p-10 flex flex-col xl:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-8 min-w-0">
            {activeView === 'overview' && (
              <>
                <BlueprintCard
                  onPlantaReady={onPlantaReady}
                  aplicarLayout={aplicarLayout}
                  layout={layout}
                  dispositivosLayout={dispositivosLayout}
                  editMode={editMode}
                  onSensorMove={handleSensorMove}
                  onDispositivoMove={handleDispositivoMove}
                  onAddItem={handleAddItem}
                  tipos={tipos}
                  comodos={comodos}
                  reloadKey={plantaReload}
                />
                <MoradorList />
              </>
            )}

            {activeView === 'analytics' && (
              <AnalisesPanel />
            )}

            {activeView === 'sensors' && (
              <SensorList
                sensores={layout}
                dispositivos={dispositivosLayout}
                comodos={comodos}
                onSaveSensor={handleSensorMove}
                onSaveDispositivo={handleDispositivoMove}
                onDeleteSensor={handleDeleteSensor}
                onDeleteDispositivo={handleDeleteDispositivo}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}

            {activeView === 'avancado' && (
              <AvancadoPanel
                activeQuery={activeQuery}
                loading={loading}
                error={error}
                result={result}
                onSelectQuery={executarQuery}
              />
            )}

            {activeView === 'history' && (
              <EventLog items={timelineItems} full />
            )}

            {activeView === 'editor' && (
              <MapaEditor reloadKey={plantaReload} />
            )}
          </div>
          {(activeView === 'overview' || activeView === 'analytics' || activeView === 'avancado') && (
            <EventLog items={timelineItems} />
          )}
        </div>
      </main>
      <BottomNav activeNav={activeNav} onNavigate={handleNavigate} />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        simStatus={simStatus}
        simLoading={simLoading}
        plantaFonte={plantaInfo.fonte}
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onUploadPlanta={handleUploadPlanta}
        onIniciarAoVivo={() =>
          iniciar({ modo: 'ao_vivo', cenario: 'luto', velocidade: 3, dias: 1 })
        }
        onIniciarBatch={() =>
          iniciar({ modo: 'batch', cenario: 'luto', dias: 30, velocidade: 1440 })
        }
        onPararSim={parar}
      />
    </div>
  );
}
