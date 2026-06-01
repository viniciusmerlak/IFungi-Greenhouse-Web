import { Outlet, NavLink } from 'react-router-dom'
import { Camera, History, Settings, Sparkles } from 'lucide-react'
import ScheduledCaptureRunner from '../features/capture/ScheduledCaptureRunner'
import ErrorBoundary from './ErrorBoundary'

export default function Layout() {
  return (
    <div>
      <ScheduledCaptureRunner />
      <nav className="app-nav">
        <div className="nav-brand">
          <span className="brand-mark">IF</span>
          <span>IFungi AI Desktop</span>
        </div>
        <NavLink to="/setup" className="nav-link">
          <Settings size={16} />
          <span>Setup</span>
        </NavLink>
        <NavLink to="/capture" className="nav-link">
          <Camera size={16} />
          <span>Capture</span>
        </NavLink>
        <NavLink to="/history" className="nav-link">
          <History size={16} />
          <span>History</span>
        </NavLink>
        <NavLink to="/ai-suggestions" className="nav-link">
          <Sparkles size={16} />
          <span>AI Suggestions</span>
        </NavLink>
      </nav>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
