import { useEffect, useState } from 'react'
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
  const { data, historicalArray, loading } = useGreenhouseData(selectedId)

  useEffect(() => {
    if (!user?.uid) return undefined
    const unsub = subscribeAllowedGreenhouses(user.uid, (value) => {
      const list = Array.isArray(value) ? value : Object.values(value || {})
      setGreenhouses(list)
      if (!selectedId && list.length) setSelectedId(list[0])
    })
    return () => unsub()
  }, [user?.uid, selectedId])

  return (
    <main className="page">
      <header className="row-between">
        <h1>IFungi Greenhouse</h1>
        <button onClick={logout}>Sair</button>
      </header>
      <GreenhouseSelector greenhouses={greenhouses} selectedId={selectedId} onSelect={setSelectedId} />
      {loading ? <p>Carregando dados da estufa...</p> : null}
      {selectedId ? (
        <>
          <SensorCards sensores={data.sensores} aguaBaixa={!!data?.niveis?.agua} atuadores={data.atuadores} />
          <ActuatorPanel greenhouseId={selectedId} atuadores={data.atuadores} debugMode={!!data.debug_mode} manualActuators={data.manual_actuators} />
          <HistoricalChart data={historicalArray} />
          <SetpointsEditor greenhouseId={selectedId} setpoints={data.setpoints} />
          <LEDScheduleEditor greenhouseId={selectedId} schedule={data.led_schedule} />
          <OperationModeEditor greenhouseId={selectedId} operationMode={data.operation_mode} />
          <OTAModal greenhouseId={selectedId} ota={data.ota} />
        </>
      ) : (
        <div className="card">Nenhuma estufa permitida para este usuario.</div>
      )}
    </main>
  )
}
