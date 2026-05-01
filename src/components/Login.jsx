import { useState } from 'react'
import toast from 'react-hot-toast'
import { loginWithEmail, signupWithEmail } from '../services/auth'

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
        toast.success('Conta criada com sucesso')
      } else {
        await loginWithEmail(email, password)
        toast.success('Login realizado com sucesso')
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
      <form className="card login-card" onSubmit={handleSubmit}>
        <h2>IFungi Greenhouse</h2>
        <p className="hint-text" style={{ marginBottom: '1rem' }}>
          {isSignup ? 'Crie uma conta para acessar o painel' : 'Entre na sua conta'}
        </p>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={isSignup ? 6 : undefined}
            required
          />
        </label>
        {isSignup && (
          <label>
            Confirmar senha
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>
        )}
        <button type="submit" disabled={loading}>
          {loading
            ? isSignup
              ? 'Criando conta...'
              : 'Entrando...'
            : isSignup
              ? 'Criar conta'
              : 'Entrar'}
        </button>
        <button
          type="button"
          onClick={switchMode}
          disabled={loading}
          className="link-button"
          style={{
            background: 'transparent',
            color: 'var(--accent-green)',
            border: 'none',
            textDecoration: 'underline',
            cursor: 'pointer',
            marginTop: '0.75rem',
            padding: 0,
            font: 'inherit',
          }}
        >
          {isSignup ? 'Ja tenho conta. Entrar.' : 'Nao tenho conta. Criar uma agora.'}
        </button>
      </form>
    </div>
  )
}
