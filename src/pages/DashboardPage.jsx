/**
 * DashboardPage.jsx
 * Página principal do dashboard — adaptada para a estrutura real do banco.
 *
 * Mudanças em relação à versão anterior:
 *  - SensorCards recebe sensor_status e setpoints (para mostrar alertas por setpoint)
 *  - StatusBar exibe status.online, lastHeartbeat, ip e saúde dos sensores
 *  - LogsPanel exibe logs.recent e logs.last_errors
 *  - GreenhouseSelector agora recebe a lista direto (normalizada em rtdb.js)
 *  - Todos os componentes usam os campos reais do banco
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ActuatorPanel from '../components/Dashboard/ActuatorPanel'
import GreenhouseSelector from '../components/Dashboard/GreenhouseSelector'
import HistoricalChart from '../components/Dashboard/HistoricalChart'
import SensorCards from '../components/Dashboard/SensorCards'
import StatusBar from '../components/Dashboard/StatusBar'
import LogsPanel from '../components/Dashboard/LogsPanel'
import LEDScheduleEditor from '../components/Config/LEDScheduleEditor'
import OperationModeEditor from '../components/Config/OperationModeEditor'
import SetpointsEditor from '../components/Config/SetpointsEditor'
import OTAModal from '../components/OTA/OTAModal'
import useGreenhouseData from '../hooks/useGreenhouseData'
import { logout, useAuthState } from '../services/auth'
import { subscribeAllowedGreenhouses } from '../services/rtdb'

export default function DashboardPage() {
  const { user } = useAuthState()
  const [greenhouses, setGreenhouses] = useState([])
  const [selectedId, setSelectedId]   = useState('')

  const { data, historicalArray, loading, connected, error } = useGreenhouseData(selectedId)

  useEffect(() => {
    if (!user?.uid) return undefined
    const unsub = subscribeAllowedGreenhouses(user.uid, (list) => {
      setGreenhouses(list)
      if (!selectedId && list.length) setSelectedId(list[0])
    })
    return () => unsub()
  }, [user?.uid, selectedId])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  return (
    <main className="page">
      <header className="row-between">
        <h1>IFungi Greenhouse</h1>
        <button onClick={logout}>Sair</button>
      </header>

      {!connected && (
        <div className="card warning-card">⚠ Sem conexão com o Firebase RTDB.</div>
      )}

      <GreenhouseSelector
        greenhouses={greenhouses}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {loading && <p style={{ textAlign: 'center', padding: '1rem' }}>Carregando dados da estufa...</p>}

      {selectedId ? (
        <div className="dashboard-layout">

          {/* Status geral */}
          <StatusBar status={data.status} sensor_status={data.sensor_status} />

          {/* Monitoramento */}
          <section className="dashboard-section">
            <h2 className="section-title">Monitoramento</h2>
            <SensorCards
              sensores={data.sensores}
              niveis={data.niveis}
              sensor_status={data.sensor_status}
              setpoints={data.setpoints}
              atuadores={data.atuadores}
            />
          </section>

          {/* Controle operacional */}
          <section className="dashboard-section">
            <h2 className="section-title">Controle operacional</h2>
            <div className="config-grid">
              <ActuatorPanel
                greenhouseId={selectedId}
                atuadores={data.atuadores}
                debugMode={!!data.debug_mode}
                manualActuators={data.manual_actuators}
              />
              <OperationModeEditor
                key={`mode-${selectedId}-${data.operation_mode?.mode ?? 'manual'}`}
                greenhouseId={selectedId}
                operationMode={data.operation_mode}
              />
              <LEDScheduleEditor
                key={`led-${selectedId}-${data.led_schedule?.onHour ?? 0}-${data.led_schedule?.offHour ?? 0}`}
                greenhouseId={selectedId}
                schedule={data.led_schedule}
              />
              <SetpointsEditor
                key={`sp-${selectedId}-${data.setpoints?.tMin ?? 0}-${data.setpoints?.tMax ?? 0}`}
                greenhouseId={selectedId}
                setpoints={data.setpoints}
              />
            </div>
          </section>

          {/* Histórico, Logs e OTA */}
          <section className="dashboard-section">
            <h2 className="section-title">Histórico e diagnóstico</h2>
            <HistoricalChart data={historicalArray} />
            <LogsPanel logs={data.logs} />
            <OTAModal greenhouseId={selectedId} ota={data.ota} />
          </section>

        </div>
      ) : (
        !loading && (
          <div className="card">Nenhuma estufa permitida para este usuário.</div>
        )
      )}
    </main>
  )
}
