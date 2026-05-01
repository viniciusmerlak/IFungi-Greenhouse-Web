/**
 * DashboardPage.jsx — Djamor redesign.
 * Header com logo de cogumelo, animações de entrada por seção,
 * tipografia e ícones consistentes (lucide-react).
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Activity, Gauge, Sliders, History, LogOut, AlertTriangle } from 'lucide-react'
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
import MushroomLogo from '../components/Brand/MushroomLogo'
import useGreenhouseData from '../hooks/useGreenhouseData'
import { logout, useAuthState } from '../services/auth'
import { subscribeAllowedGreenhouses } from '../services/rtdb'

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.45, ease: [0.2, 0.9, 0.4, 1.05] },
  }),
}

export default function DashboardPage() {
  const { user } = useAuthState()
  const [greenhouses, setGreenhouses] = useState([])
  const [selectedId, setSelectedId] = useState('')

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
      <motion.header
        className="app-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.9, 0.4, 1.05] }}
      >
        <div className="brand">
          <MushroomLogo size={42} />
          <div className="brand-text">
            <span className="brand-name">IFungi</span>
            <span className="brand-tagline">Greenhouse · Djamor</span>
          </div>
        </div>
        <div className="header-user">
          {user?.email && <span className="user-email">{user.email}</span>}
          <button onClick={logout} className="ghost">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </motion.header>

      {!connected && (
        <motion.div
          className="card warning-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <AlertTriangle size={18} /> Sem conexão com o Firebase RTDB.
        </motion.div>
      )}

      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <GreenhouseSelector
          greenhouses={greenhouses}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </motion.div>

      {loading && (
        <div className="card full-loader" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader-spinner" />
          Carregando dados da estufa...
        </div>
      )}

      {selectedId ? (
        <div className="dashboard-layout">
          <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
            <StatusBar status={data.status} sensor_status={data.sensor_status} />
          </motion.div>

          <motion.section
            className="dashboard-section"
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="section-title">
              <Gauge size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              Monitoramento
            </h2>
            <SensorCards
              sensores={data.sensores}
              niveis={data.niveis}
              sensor_status={data.sensor_status}
              setpoints={data.setpoints}
              atuadores={data.atuadores}
            />
          </motion.section>

          <motion.section
            className="dashboard-section"
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="section-title">
              <Sliders size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              Controle operacional
            </h2>
            <div className="config-grid">
              <ActuatorPanel
                greenhouseId={selectedId}
                atuadores={data.atuadores}
                debugMode={!!data.debug_mode}
                manualActuators={data.manual_actuators}
              />
              <OperationModeEditor
                key={`mode-${selectedId}`}
                greenhouseId={selectedId}
                operationMode={data.operation_mode}
              />
              <LEDScheduleEditor
                key={`led-${selectedId}`}
                greenhouseId={selectedId}
                schedule={data.led_schedule}
              />
              <SetpointsEditor
                key={`sp-${selectedId}`}
                greenhouseId={selectedId}
                setpoints={data.setpoints}
              />
            </div>
          </motion.section>

          <motion.section
            className="dashboard-section"
            custom={4}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="section-title">
              <History size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              Histórico e diagnóstico
            </h2>
            <HistoricalChart data={historicalArray} />
            <LogsPanel logs={data.logs} />
            <OTAModal greenhouseId={selectedId} ota={data.ota} />
          </motion.section>
        </div>
      ) : (
        !loading && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={16} /> Nenhuma estufa permitida para este usuário.
          </div>
        )
      )}
    </main>
  )
}
