import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useAuthState } from '../services/auth'
import { subscribeAllowedGreenhouses } from '../services/rtdb'
import useAISuggestions from '../hooks/useAISuggestions'
import useGreenhouseData from '../hooks/useGreenhouseData'
import AppHeader from '../components/Shared/AppHeader'
import AppNavTabs from '../components/Shared/AppNavTabs'
import GreenhouseSelector from '../components/Dashboard/GreenhouseSelector'
import AISuggestionsPanel from '../components/AI/AISuggestionsPanel'
import SuggestionHistoryList from '../components/AI/SuggestionHistoryList'

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.45, ease: [0.2, 0.9, 0.4, 1.05] },
  }),
}

export default function AISuggestionsPage() {
  const { user } = useAuthState()
  const [greenhouses, setGreenhouses] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [activeTab, setActiveTab] = useState('latest') // 'latest' or 'history'

  const { data, connected } = useGreenhouseData(selectedId)
  const { latestPending, history, loading, error } = useAISuggestions(selectedId)

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
      <AppHeader />
      <AppNavTabs />

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

      {selectedId && (
        <>
          <motion.div
            className="card"
            custom={1}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'latest' ? 'active' : ''}`}
                onClick={() => setActiveTab('latest')}
              >
                Latest Suggestion
              </button>
              <button
                className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History ({history.length})
              </button>
            </div>
          </motion.div>

          {activeTab === 'latest' && (
            <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
              {loading ? (
                <div className="card full-loader">
                  <div className="loader-spinner" />
                  Carregando sugestões...
                </div>
              ) : latestPending ? (
                <AISuggestionsPanel
                  suggestion={latestPending}
                  currentSetpoints={data?.setpoints}
                  currentOperationMode={data?.operation_mode}
                  greenhouseId={selectedId}
                  userEmail={user?.email}
                />
              ) : (
                <div className="card">
                  <p className="text-muted text-center">
                    Nenhuma sugestão pendente. O agente AI irá gerar novas recomendações após análise.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
              {loading ? (
                <div className="card full-loader">
                  <div className="loader-spinner" />
                  Carregando histórico...
                </div>
              ) : (
                <SuggestionHistoryList suggestions={history} />
              )}
            </motion.div>
          )}
        </>
      )}
    </main>
  )
}
