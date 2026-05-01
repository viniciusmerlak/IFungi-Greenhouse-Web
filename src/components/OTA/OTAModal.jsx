/**
 * OTAModal.jsx — Djamor redesign.
 * Preserva 100% da lógica da pipeline (Git Blob → workflow_dispatch → release → RTDB).
 */
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  Upload,
  X,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  HardDriveUpload,
  Loader2,
  Info,
} from 'lucide-react'
import {
  createBlob,
  findRecentWorkflowRun,
  getReleaseByTag,
  getWorkflowRun,
  triggerWorkflowDispatch,
} from '../../services/github'
import { updateGreenhouseNode } from '../../services/rtdb'

const SOURCE_REPO = 'viniciusmerlak/IFungi-Greenhouse-Web'
const WORKFLOW_FILE = 'publish-ota.yml'
const WORKFLOW_REF = 'main'
const POLL_INTERVAL_MS = 5000
const POLL_TIMEOUT_MS = 10 * 60 * 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomSeed() {
  return `ifungi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 4, 14, 0.78)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
}

function PublishForm({ greenhouseId, ota, onClose }) {
  const [version, setVersion] = useState('')
  const [token, setToken] = useState(localStorage.getItem('ifungi_github_token') || '')
  const [repo, setRepo] = useState(localStorage.getItem('ifungi_repo') || '')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [loading, setLoading] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState('')

  const onDrop = useCallback((accepted) => {
    const f = accepted?.[0]
    if (!f) return
    if (!f.name.endsWith('.bin')) {
      toast.error('Use um arquivo .bin')
      return
    }
    setFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'application/octet-stream': ['.bin'] },
  })

  const publish = async () => {
    if (!file || !version || !token || !repo) {
      toast.error('Preencha todos os campos e selecione o arquivo')
      return
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      toast.error('Versão inválida. Use X.Y.Z')
      return
    }

    localStorage.setItem('ifungi_github_token', token)
    localStorage.setItem('ifungi_repo', repo)

    setLoading(true)
    setProgress(0)
    setPublishedUrl('')

    const tag = `v${version}`
    const seed = randomSeed()

    try {
      const existing = await getReleaseByTag(token, repo, tag)
      if (existing) {
        toast.error(`Release ${tag} já existe no GitHub. Use outra versão.`)
        return
      }

      setStage('Lendo .bin')
      setProgress(10)
      const base64 = await fileToBase64(file)
      setProgress(25)

      setStage('Subindo .bin como Git blob')
      const stagingSha = await createBlob(token, SOURCE_REPO, base64)
      setProgress(40)

      setStage('Disparando GitHub Actions')
      const dispatchedAt = new Date()
      await triggerWorkflowDispatch(token, SOURCE_REPO, WORKFLOW_FILE, WORKFLOW_REF, {
        version,
        staging_sha: stagingSha,
        target_repo: repo,
        run_seed: seed,
      })
      setProgress(45)

      setStage('Aguardando workflow começar')
      let run = null
      const sinceIso = new Date(dispatchedAt.getTime() - 60_000).toISOString()
      const findDeadline = Date.now() + 60_000
      while (Date.now() < findDeadline) {
        await sleep(POLL_INTERVAL_MS)
        run = await findRecentWorkflowRun(token, SOURCE_REPO, WORKFLOW_FILE, sinceIso, seed)
        if (run) break
      }
      if (!run) throw new Error('Não consegui localizar o run do workflow no GitHub Actions')
      setProgress(55)

      setStage('GitHub Actions executando')
      const runDeadline = Date.now() + POLL_TIMEOUT_MS
      while (Date.now() < runDeadline) {
        const status = await getWorkflowRun(token, SOURCE_REPO, run.id)
        if (status.status === 'completed') {
          if (status.conclusion !== 'success') {
            throw new Error(
              `Workflow terminou com status "${status.conclusion}". Veja os logs em ${status.html_url}`,
            )
          }
          run = status
          break
        }
        setProgress((p) => Math.min(85, p + 2))
        await sleep(POLL_INTERVAL_MS)
      }
      if (run.status !== 'completed') throw new Error('Timeout aguardando o workflow terminar')
      setProgress(90)

      setStage('Verificando release no GitHub')
      const release = await getReleaseByTag(token, repo, tag)
      const asset = release?.assets?.find((a) => a.name === 'firmware.bin')
      if (!asset?.browser_download_url) {
        throw new Error('Release publicada mas sem asset firmware.bin. Veja os logs do workflow.')
      }
      const downloadUrl = asset.browser_download_url
      setProgress(95)

      setStage('Atualizando Firebase')
      await updateGreenhouseNode(greenhouseId, 'ota', {
        available: true,
        version,
        url: downloadUrl,
        notes: `Publicado em ${new Date().toLocaleString('pt-BR')}`,
        lastPublishedAt: Math.floor(Date.now() / 1000),
      })

      setProgress(100)
      setPublishedUrl(downloadUrl)
      toast.success('OTA publicada e Firebase atualizado!')
    } catch (err) {
      const msg = err?.response?.data?.message || err.message
      toast.error(msg || 'Falha ao publicar OTA')
    } finally {
      setLoading(false)
      setStage('')
    }
  }

  const reset = () => {
    setPublishedUrl('')
    setFile(null)
    setProgress(0)
    setVersion('')
  }

  if (publishedUrl) {
    return (
      <div className="ota-card">
        <div
          className="card"
          style={{
            borderColor: 'rgba(74, 222, 128, 0.45)',
            background:
              'linear-gradient(160deg, rgba(74, 222, 128, 0.12), rgba(6, 182, 212, 0.06))',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--ok)',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            <CheckCircle2 size={18} /> OTA publicada com sucesso
          </div>
          <p className="hint-text" style={{ marginBottom: '0.5rem' }}>
            URL gravada em <code className="code-inline">greenhouses/{greenhouseId}/ota.url</code>:
          </p>
          <a
            href={publishedUrl}
            target="_blank"
            rel="noreferrer"
            className="code-inline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', wordBreak: 'break-all' }}
          >
            <ExternalLink size={12} />
            {publishedUrl}
          </a>
          <p className="hint-text" style={{ marginTop: '0.5rem' }}>
            O ESP32 irá detectar a atualização no próximo ciclo de verificação.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={reset}>Publicar outra versão</button>
          <button onClick={onClose} className="ghost">
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ota-card">
      <div
        className="card"
        style={{
          background: 'linear-gradient(160deg, rgba(168, 85, 247, 0.08), rgba(6, 182, 212, 0.05))',
          padding: '0.85rem 1rem',
          fontSize: '0.82rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Info size={16} style={{ flexShrink: 0, color: 'var(--cyan-400)' }} />
          <span>
            O navegador sobe o <code className="code-inline">.bin</code> como Git blob, dispara{' '}
            <code className="code-inline">publish-ota.yml</code>, e a release fica em{' '}
            <code className="code-inline">/firmware.bin</code>.
          </span>
        </div>
      </div>

      <label>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <GitBranch size={14} /> PAT GitHub (contents:write + actions:write)
        </span>
        <input
          type="password"
          placeholder="ghp_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <span className="hint-text">Salvo apenas no navegador (localStorage).</span>
      </label>

      <label>
        Repositório de releases
        <input
          placeholder="usuario/IFUNGI-OTA-UPDATES"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
      </label>

      <label>
        Versão do firmware
        <input
          placeholder="1.2.5"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        />
        <span className="hint-text">
          Formato semver X.Y.Z. A tag publicada será{' '}
          <code className="code-inline">v{version || 'X.Y.Z'}</code>.
        </span>
      </label>

      <label>
        Arquivo firmware (.bin)
        <div className={`dropzone ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
          <input {...getInputProps()} />
          <Upload size={20} style={{ marginBottom: 4 }} />
          <strong>
            {isDragActive
              ? 'Solte o arquivo aqui'
              : file
                ? file.name
                : 'Arraste o .bin ou clique para selecionar'}
          </strong>
          {file && (
            <div style={{ fontSize: '0.78rem' }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>
      </label>

      <label>
        Estufa alvo
        <code className="code-inline" style={{ padding: '0.5rem 0.75rem', display: 'block' }}>
          {greenhouseId}
        </code>
      </label>

      {loading && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.82rem',
              color: 'var(--pink-300)',
              marginBottom: '0.4rem',
            }}
          >
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span>
              {stage || 'Enviando'}... {progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {ota?.lastInstalledVersion && (
        <div className="status djamor" style={{ alignSelf: 'flex-start' }}>
          <CheckCircle2 size={11} /> Instalada: v{ota.lastInstalledVersion}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={publish} disabled={loading} className="primary" style={{ flex: 1 }}>
          {loading ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Publicando... {progress}%
            </>
          ) : (
            <>
              <HardDriveUpload size={14} /> Publicar OTA
            </>
          )}
        </button>
        <button onClick={onClose} className="ghost" disabled={loading}>
          Fechar
        </button>
      </div>
    </div>
  )
}

export default function OTAModal({ greenhouseId, ota = {} }) {
  const [open, setOpen] = useState(false)

  const isAvailable = Boolean(ota?.available)

  return (
    <>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span className="header-icon">
            <Rocket size={16} />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
              Atualização de Firmware (OTA)
            </div>
            <div className="hint-text" style={{ marginTop: 2 }}>
              {isAvailable ? (
                <span style={{ color: 'var(--gold-400)' }}>
                  Atualização pendente: v{ota.version}
                </span>
              ) : ota.lastInstalledVersion ? (
                `Instalada: v${ota.lastInstalledVersion}`
              ) : (
                'Nenhuma atualização pendente'
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="primary">
          <Rocket size={14} /> Publicar OTA
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            style={overlayStyle}
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="card"
              style={{
                width: '100%',
                maxWidth: 580,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '1.25rem 1.4rem',
              }}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.2, 0.9, 0.4, 1.05] }}
            >
              <div className="card-header">
                <h3>
                  <span className="header-icon">
                    <Rocket size={16} />
                  </span>
                  Publicar Firmware OTA
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="code-inline">{greenhouseId}</span>
                  <button
                    className="icon-button ghost"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <PublishForm
                greenhouseId={greenhouseId}
                ota={ota}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
