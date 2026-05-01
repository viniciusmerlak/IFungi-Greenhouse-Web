import { useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react'
import { loginWithEmail, signupWithEmail } from '../services/auth'
import MushroomLogo from './Brand/MushroomLogo'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const isSignup = mode === 'signup'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSignup) {
      if (password.length < 6) {
        toast.error('A senha precisa ter pelo menos 6 caracteres')
        return
      }
      if (password !== confirmPassword) {
        toast.error('As senhas nao conferem')
        return
      }
    }
    try {
      setLoading(true)
      if (isSignup) {
        await signupWithEmail(email, password)
        toast.success('Conta criada')
      } else {
        await loginWithEmail(email, password)
        toast.success('Bem-vindo')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="center-screen">
      <motion.div
        className="auth-shell"
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.2, 0.9, 0.4, 1.05] }}
      >
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-brand">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <MushroomLogo size={64} />
            </motion.div>
            <span className="auth-brand-name">IFungi</span>
            <span className="auth-tagline">Greenhouse · Djamor</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="auth-mode-text"
            >
              {isSignup ? 'Crie sua conta para acessar o painel' : 'Entre com sua conta'}
            </motion.div>
          </AnimatePresence>

          <label>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} /> E-mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
            />
          </label>

          <label>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={14} /> Senha
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder={isSignup ? 'Mínimo 6 caracteres' : 'Sua senha'}
              minLength={isSignup ? 6 : undefined}
              required
            />
          </label>

          <AnimatePresence>
            {isSignup && (
              <motion.label
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} /> Confirmar senha
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required={isSignup}
                />
              </motion.label>
            )}
          </AnimatePresence>

          <button type="submit" className="primary" disabled={loading} style={{ marginTop: '0.4rem' }}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                {isSignup ? 'Criando...' : 'Entrando...'}
              </>
            ) : isSignup ? (
              <>
                <UserPlus size={16} /> Criar conta
              </>
            ) : (
              <>
                <LogIn size={16} /> Entrar
              </>
            )}
          </button>

          <button
            type="button"
            className="auth-switch"
            onClick={switchMode}
            disabled={loading}
          >
            {isSignup ? 'Já tenho uma conta. Entrar.' : 'Ainda não tenho conta. Criar uma agora.'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
