import { useState } from 'react'

export default function GitHubTokenForm({ onSubmit, defaultToken = '', defaultRepo = '' }) {
  const [token, setToken] = useState(defaultToken)
  const [repo, setRepo] = useState(defaultRepo)

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ token, repo })
      }}
    >
      <label>
        Token GitHub (PAT repo)
        <input value={token} onChange={(e) => setToken(e.target.value)} required />
      </label>
      <label>
        Repositorio (usuario/repositorio)
        <input value={repo} onChange={(e) => setRepo(e.target.value)} required />
      </label>
      <button type="submit">Salvar credenciais localmente</button>
    </form>
  )
}
