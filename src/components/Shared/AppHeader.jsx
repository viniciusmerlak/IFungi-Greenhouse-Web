import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import MushroomLogo from '../Brand/MushroomLogo'
import { logout, useAuthState } from '../../services/auth'

export default function AppHeader() {
  const { user } = useAuthState()

  return (
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
          <span className="brand-tagline">Greenhouse · IFungi</span>
        </div>
      </div>
      <div className="header-user">
        {user?.email && <span className="user-email">{user.email}</span>}
        <button onClick={logout} className="ghost">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </motion.header>
  )
}
