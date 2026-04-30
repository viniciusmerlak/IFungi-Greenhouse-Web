import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ActuatorPanel from '../components/Dashboard/ActuatorPanel'
import GreenhouseSelector from '../components/Dashboard/GreenhouseSelector'
import HistoricalChart from '../components/Dashboard/HistoricalChart'
import SensorCards from '../components/Dashboard/SensorCards'
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
  const [selectedId, setSelectedId] = useState('')
  const { data, historicalArray, loading, connected, error } = useGreenhouseData(selectedId)

  useEffect(() => {
    if (!user?.uid) return undefined
    const unsub = subscribeAllowedGreenhouses(user.uid, (value) => {
      const list = Array.isArray(value) ? value : []
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
      {!connected ? <div className="card warning-card">Sem conexao com Firebase RTDB.</div> : null}
      <GreenhouseSelector greenhouses={greenhouses} selectedId={selectedId} onSelect={setSelectedId} />
      {loading ? <p>Carregando dados da estufa...</p> : null}
      {selectedId ? (
        <div className="dashboard-layout">
          <section className="dashboard-section">
            <h2 className="section-title">Monitoramento</h2>
            <SensorCards sensores={data.sensores} aguaBaixa={!!data?.niveis?.agua} atuadores={data.atuadores} />
          </section>

          <section className="dashboard-section">
            <h2 className="section-title">Controle operacional</h2>
            <div className="config-grid">
              <ActuatorPanel greenhouseId={selectedId} atuadores={data.atuadores} debugMode={!!data.debug_mode} manualActuators={data.manual_actuators} />
              <OperationModeEditor key={`mode-${selectedId}-${data?.operation_mode?.mode || 'manual'}`} greenhouseId={selectedId} operationMode={data.operation_mode} />
              <LEDScheduleEditor key={`led-${selectedId}-${data?.led_schedule?.onHour ?? 0}-${data?.led_schedule?.offHour ?? 0}-${data?.led_schedule?.intensity ?? 0}`} greenhouseId={selectedId} schedule={data.led_schedule} />
              <SetpointsEditor key={`sp-${selectedId}-${data?.setpoints?.tMin ?? 0}-${data?.setpoints?.tMax ?? 0}-${data?.setpoints?.uMin ?? 0}-${data?.setpoints?.uMax ?? 0}`} greenhouseId={selectedId} setpoints={data.setpoints} />
            </div>
          </section>

          <section className="dashboard-section">
            <h2 className="section-title">Historico e OTA</h2>
            <HistoricalChart data={historicalArray} />
            <OTAModal greenhouseId={selectedId} ota={data.ota} />
          </section>
        </div>
      ) : (
        <div className="card">Nenhuma estufa permitida para este usuario.</div>
      )}
    </main>
  )
}
