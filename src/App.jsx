import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './components/Login'
import DashboardPage from './pages/DashboardPage'
import { useAuthState } from './services/auth'

function App() {
  const { user, loading } = useAuthState()

  if (loading) {
    return <div className="center-screen">Carregando...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <DashboardPage /> : <Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
