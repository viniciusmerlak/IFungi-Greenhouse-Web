import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import SetupPage from './pages/SetupPage'
import CapturePage from './pages/CapturePage'
import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/setup" replace />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="capture" element={<CapturePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="ai-suggestions" element={<HistoryPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
