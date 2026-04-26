import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { createRelease, getReleaseByTag, uploadReleaseAsset } from '../../services/github'
import { writeGreenhouseNode } from '../../services/rtdb'
import GitHubTokenForm from './GitHubTokenForm'

export default function OTAModal({ greenhouseId, ota = {} }) {
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState('')
  const [repo, setRepo] = useState(localStorage.getItem('ifungi_repo') || '')
  const [token, setToken] = useState(localStorage.getItem('ifungi_github_token') || '')
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback((accepted) => {
    const selected = accepted?.[0]
    if (!selected) return
    if (!selected.name.endsWith('.bin')) {
      toast.error('Arquivo invalido. Use .bin')
      return
    }
    setFile(selected)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false, accept: { 'application/octet-stream': ['.bin'] } })

  const saveCreds = ({ token: tokenValue, repo: repoValue }) => {
    localStorage.setItem('ifungi_github_token', tokenValue)
    localStorage.setItem('ifungi_repo', repoValue)
    setToken(tokenValue)
    setRepo(repoValue)
    toast.success('Credenciais salvas no navegador')
  }

  const startOta = async () => {
    if (!file || !version || !token || !repo) {
      toast.error('Preencha token, repositorio, versao e arquivo .bin')
      return
    }
    if (token.trim() === 'OTA_GITHUB_TOKEN') {
      toast.error('No campo token, use o valor real do PAT do GitHub, nao o nome do secret.')
      return
    }
    setLoading(true)
    try {
      const tag = `v${version}`
      const existing = await getReleaseByTag(token, repo, tag)
      if (existing) {
        toast.error('Tag ja existe no GitHub. Use outra versao.')
        setLoading(false)
        return
      }

      const release = await createRelease(token, repo, tag, `OTA ${new Date().toISOString()}`)
      const asset = await uploadReleaseAsset(token, release.upload_url, file, setProgress)
      const downloadUrl = asset.browser_download_url

      await writeGreenhouseNode(greenhouseId, 'ota', {
        available: true,
        version,
        url: downloadUrl,
        notes: `Atualizacao enviada via site em ${new Date().toLocaleString()}`,
        lastInstalledVersion: ota.lastInstalledVersion || 'desconhecida',
      })
      toast.success('OTA publicada no GitHub e enviada ao Firebase')
      setOpen(false)
      setFile(null)
      setProgress(0)
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      toast.error(apiMessage || error.message || 'Falha ao publicar OTA no GitHub')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <button onClick={() => setOpen((prev) => !prev)}>Atualizar Firmware</button>
      {open && (
        <div className="modal">
          <h3>OTA Firmware</h3>
          <p>Versao instalada: {ota.lastInstalledVersion || 'desconhecida'}</p>
          <div className="card">
            <h4>Fluxo recomendado: GitHub Actions</h4>
            <p>
              Execute o workflow <strong>Publish OTA Firmware</strong> em Actions para publicar o .bin no GitHub e atualizar
              automaticamente o Firebase.
            </p>
            <p>
              Inputs do workflow: <code>version</code>, <code>greenhouse_id</code>, <code>firmware_url</code> e{' '}
              <code>release_repo</code>.
            </p>
          </div>
          <label>
            Nova versao (X.Y.Z)
            <input value={version} onChange={(e) => setVersion(e.target.value)} />
          </label>
          <GitHubTokenForm onSubmit={saveCreds} defaultToken={token} defaultRepo={repo} />
          <div className="dropzone" {...getRootProps()}>
            <input {...getInputProps()} />
            {isDragActive ? 'Solte o .bin aqui' : file ? `Arquivo: ${file.name}` : 'Arraste o .bin ou clique'}
          </div>
          {loading ? <p>Upload: {progress}%</p> : null}
          <div className="row-wrap">
            <button onClick={startOta} disabled={loading}>
              Publicar OTA (manual no navegador)
            </button>
            <button onClick={() => setOpen(false)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
