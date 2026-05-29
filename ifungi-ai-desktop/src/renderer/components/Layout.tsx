import { Outlet, NavLink } from 'react-router-dom'
import { useScheduledCaptureListener } from '../features/capture/useScheduledCaptureListener'
import ErrorBoundary from './ErrorBoundary'

export default function Layout() {
  useScheduledCaptureListener()

  return (
    <div>
      <nav className="app-nav">
        <NavLink to="/setup" className="nav-link">
          Setup
        </NavLink>
        <NavLink to="/capture" className="nav-link">
          Capture
        </NavLink>
        <NavLink to="/history" className="nav-link">
          History
        </NavLink>
        <NavLink to="/ai-suggestions" className="nav-link">
          AI Suggestions
        </NavLink>
      </nav>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
