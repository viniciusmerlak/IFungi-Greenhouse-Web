import { NavLink } from 'react-router-dom'
import { Activity, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AppNavTabs() {
  return (
    <motion.nav
      className="app-nav-tabs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <NavLink
        to="/dashboard"
        className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
      >
        <Activity size={18} />
        <span>Dashboard</span>
      </NavLink>
      <NavLink
        to="/ai-suggestions"
        className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
      >
        <Sparkles size={18} />
        <span>AI Suggestions</span>
      </NavLink>
    </motion.nav>
  )
}
