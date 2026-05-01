/**
 * OTAModal.jsx
 * Painel unificado de atualizacao OTA.
 *
 * Pipeline (100% gratuita, sem Firebase Storage):
 *   1. Navegador le o .bin, converte pra base64 e cria um Git blob em
 *      `viniciusmerlak/IFungi-Greenhouse-Web` via POST /git/blobs
 *      (api.github.com suporta CORS). O blob e dangling -- nenhum commit o
 *      referencia, entao o GC do GitHub remove no proximo ciclo.
 *   2. Navegador dispara `workflow_dispatch` em `publish-ota.yml` passando
 *      { version, staging_sha, target_repo, run_seed }.
 *   3. Workflow (server-side, sem restricao de CORS) baixa o blob via
 *      /git/blobs/{sha}, valida tamanho/magic, cria a release em
 *      `target_repo` e sobe o asset com nome `firmware.bin`.
 *   4. Navegador faz polling do run ate completar, le a release via
 *      /releases/tags/{tag} e grava
 *      { available, version, url, notes, lastPublishedAt } em
 *      /greenhouses/{greenhouseId}/ota.
 *
 * O upload direto pra `uploads.github.com` foi removido porque o GitHub nao
 * envia headers CORS nesse endpoint -- por isso a passagem pelo workflow.
 */
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
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

/**
 * Le o File como base64 (sem o prefixo `data:...;base64,`).
 * O resultado eh enviado pra POST /git/blobs com encoding=base64.
 */
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

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
  },
  modal: {
    background: 'var(--bg, #1a1a2e)', border: '1px solid var(--border, #2a2a4a)',
    borderRadius: '12px', width: '100%', maxWidth: '540px',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  header: {
    padding: '1.25rem 1.5rem 1rem',
    borderBottom: '1px solid var(--border, #2a2a4a)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { margin: 0, fontSize: '1rem', fontWeight: 600, letterSpacing: '0.01em' },
  badge: {
    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px',
    background: 'var(--accent-dim, #2d2d5a)', color: 'var(--accent, #7c7cff)',
    fontFamily: 'monospace', letterSpacing: '0.05em',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '1.25rem', lineHeight: 1, opacity: 0.6, padding: '4px',
    color: 'inherit',
  },
  body: { padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted, #888)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  input: {
    padding: '0.6rem 0.75rem', borderRadius: '7px', fontSize: '0.875rem',
    border: '1px solid var(--border, #2a2a4a)', background: 'var(--bg-raised, #12122a)',
    color: 'inherit', outline: 'none', fontFamily: 'inherit', width: '100%',
    boxSizing: 'border-box',
  },
  hint: { fontSize: '0.7rem', color: 'var(--text-muted, #666)', lineHeight: 1.5 },
  infoBox: {
    padding: '0.75rem 1rem', borderRadius: '8px',
    background: 'var(--bg-raised, #12122a)', border: '1px solid var(--border, #2a2a4a)',
    fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted, #aaa)',
  },
  codeBlock: {
    background: 'var(--bg, #0d0d1e)', borderRadius: '6px',
    padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.75rem',
    color: 'var(--accent, #7c7cff)', overflowX: 'auto', whiteSpace: 'nowrap',
    border: '1px solid var(--border, #2a2a4a)',
  },
  dropzone: (active) => ({
    border: `2px dashed ${active ? 'var(--accent, #7c7cff)' : 'var(--border, #2a2a4a)'}`,
    borderRadius: '8px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.15s', fontSize: '0.85rem', color: 'var(--text-muted, #888)',
    background: active ? 'var(--accent-dim, #1a1a40)' : 'transparent',
  }),
  progress: {
    height: '4px', borderRadius: '2px', background: 'var(--border, #2a2a4a)',
    overflow: 'hidden', marginTop: '0.25rem',
  },
  progressBar: (pct) => ({
    height: '100%', width: `${pct}%`, transition: 'width 0.2s',
    background: 'linear-gradient(90deg, #7c7cff, #a78bfa)',
  }),
  footer: {
    padding: '1rem 1.5rem', borderTop: '1px solid var(--border, #2a2a4a)',
    display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
  },
  btnPrimary: {
    padding: '0.6rem 1.25rem', borderRadius: '7px', border: 'none',
    background: 'var(--accent, #7c7cff)', color: '#fff', cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: 600, transition: 'opacity 0.15s',
  },
  btnSecondary: {
    padding: '0.6rem 1.25rem', borderRadius: '7px',
    border: '1px solid var(--border, #2a2a4a)', background: 'none',
    color: 'inherit', cursor: 'pointer', fontSize: '0.85rem',
  },
  statusRow: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    fontSize: '0.8rem', color: 'var(--text-muted, #888)',
  },
  dot: (color) => ({
    width: '7px', height: '7px', borderRadius: '50%',
    background: color, flexShrink: 0,
  }),
}

function PublishForm({ greenhouseId, ota }) {
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
      toast.error('Versao invalida. Use X.Y.Z')
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
        toast.error(`Release ${tag} ja existe no GitHub. Use outra versao.`)
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

      setStage('Aguardando workflow comecar')
      let run = null
      const sinceIso = new Date(dispatchedAt.getTime() - 60_000).toISOString()
      const findDeadline = Date.now() + 60_000
      while (Date.now() < findDeadline) {
        await sleep(POLL_INTERVAL_MS)
        run = await findRecentWorkflowRun(token, SOURCE_REPO, WORKFLOW_FILE, sinceIso, seed)
        if (run) break
      }
      if (!run) throw new Error('Nao consegui localizar o run do workflow no GitHub Actions')
      setProgress(55)

      setStage('GitHub Actions executando')
      const runDeadline = Date.now() + POLL_TIMEOUT_MS
      while (Date.now() < runDeadline) {
        const status = await getWorkflowRun(token, SOURCE_REPO, run.id)
        if (status.status === 'completed') {
          if (status.conclusion !== 'success') {
            throw new Error(`Workflow terminou com status "${status.conclusion}". Veja os logs em ${status.html_url}`)
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
      <div style={S.body}>
        <div style={{ ...S.infoBox, borderColor: '#22c55e33', background: '#052e1633' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#4ade80' }}>
            OTA publicada com sucesso
          </div>
          <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            URL gravada em <code>greenhouses/{greenhouseId}/ota.url</code>:
          </div>
          <div style={S.codeBlock}>{publishedUrl}</div>
          <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--text-muted, #888)' }}>
            O ESP32 ira detectar a atualizacao no proximo ciclo de verificacao.
          </div>
        </div>
        <button style={S.btnSecondary} onClick={reset}>
          Publicar outra versao
        </button>
      </div>
    )
  }

  return (
    <div style={S.body}>
      <div style={S.infoBox}>
        <strong>Pipeline OTA</strong>
        <br />
        O navegador sobe o <code>.bin</code> como Git blob via API, dispara o workflow{' '}
        <code>publish-ota.yml</code> no GitHub Actions (que cria a release com asset{' '}
        <code>firmware.bin</code>), e grava a URL final em{' '}
        <code>greenhouses/{'{id}'}/ota</code>.
      </div>

      <div style={S.field}>
        <label style={S.label}>PAT GitHub (contents:write + actions:write em IFungi-Greenhouse-Web)</label>
        <input
          style={S.input}
          type="password"
          placeholder="ghp_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <span style={S.hint}>Salvo apenas no navegador (localStorage).</span>
      </div>

      <div style={S.field}>
        <label style={S.label}>Repositorio de releases</label>
        <input
          style={S.input}
          placeholder="usuario/IFUNGI-OTA-UPDATES"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
      </div>

      <div style={S.field}>
        <label style={S.label}>Versao do firmware</label>
        <input
          style={S.input}
          placeholder="1.2.5"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        />
        <span style={S.hint}>Formato semver X.Y.Z. A tag publicada sera <code>v{version || 'X.Y.Z'}</code>.</span>
      </div>

      <div style={S.field}>
        <label style={S.label}>Arquivo firmware (.bin)</label>
        <div style={S.dropzone(isDragActive)} {...getRootProps()}>
          <input {...getInputProps()} />
          {isDragActive
            ? 'Solte o arquivo aqui'
            : file
              ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)`
              : 'Arraste o .bin ou clique para selecionar'}
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Estufa alvo</label>
        <div style={S.codeBlock}>{greenhouseId}</div>
      </div>

      {loading && (
        <div>
          <div style={{ ...S.statusRow, marginBottom: '0.4rem' }}>
            <div style={S.dot('#a78bfa')} />
            <span>{stage || 'Enviando'}... {progress}%</span>
          </div>
          <div style={S.progress}>
            <div style={S.progressBar(progress)} />
          </div>
        </div>
      )}

      {ota?.lastInstalledVersion && (
        <div style={S.statusRow}>
          <div style={S.dot('#22c55e')} />
          <span>
            Versao instalada: <strong>{ota.lastInstalledVersion}</strong>
          </span>
        </div>
      )}

      <button
        style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
        onClick={publish}
        disabled={loading}
      >
        {loading ? `Publicando... ${progress}%` : 'Publicar OTA'}
      </button>
    </div>
  )
}

export default function OTAModal({ greenhouseId, ota = {} }) {
  const [open, setOpen] = useState(false)

  const isAvailable = Boolean(ota?.available)

  return (
    <>
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Atualizacao de Firmware (OTA)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
            {isAvailable ? (
              <span style={{ color: '#f59e0b' }}>Atualizacao pendente: v{ota.version}</span>
            ) : ota.lastInstalledVersion ? (
              `Instalada: v${ota.lastInstalledVersion}`
            ) : (
              'Nenhuma atualizacao pendente'
            )}
          </div>
        </div>
        <button onClick={() => setOpen(true)}>Publicar OTA</button>
      </div>

      {open && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div style={S.modal}>
            <div style={S.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={S.title}>Publicar Firmware OTA</span>
                <span style={S.badge}>{greenhouseId}</span>
              </div>
              <button style={S.closeBtn} onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <PublishForm greenhouseId={greenhouseId} ota={ota} />

            <div style={S.footer}>
              <button style={S.btnSecondary} onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
