import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from '../features/dashboard/DashboardPage'
import LoginPage from '../features/auth/LoginPage'
import AISuggestionsPage from '../pages/AISuggestionsPage'
import { useAuthState } from '../services/auth'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthState()
  if (loading) return <div className="center-screen">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function AppRouter() {
  const { user, loading } = useAuthState()
  if (loading) return <div className="center-screen">Carregando...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-suggestions"
          element={
            <ProtectedRoute>
              <AISuggestionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
