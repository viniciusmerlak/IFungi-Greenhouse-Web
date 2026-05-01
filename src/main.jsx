import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        className: 'djamor-toast',
        style: {
          background: 'rgba(46, 18, 46, 0.92)',
          color: '#fbeaf3',
          border: '1px solid rgba(255, 124, 178, 0.35)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        },
        success: { iconTheme: { primary: '#ec4899', secondary: '#fbeaf3' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#fbeaf3' } },
      }}
    />
  </StrictMode>,
)
