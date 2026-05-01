/**
 * OTAModal.jsx
 * Painel de atualização OTA — duas abas:
 *   1. Via GitHub Actions (recomendado): só insere URL + versão, o workflow faz tudo
 *   2. Via navegador (fallback): upload direto do .bin com PAT
 *
 * Fluxo da aba Actions:
 *   - Usuário cola a URL do firmware.bin (qualquer host)
 *   - Usuário informa a versão e o greenhouse_id já vem da prop
 *   - Ao submeter, o workflow Actions baixa o .bin, cria release no GitHub,
 *     faz upload e atualiza o Firebase automaticamente
 *   - Para disparar sem sair da página, usamos a API REST do GitHub Actions
 *     (workflow_dispatch) — requer PAT com permissão actions:write
 *
 * Fluxo da aba Navegador:
 *   - Upload direto do .bin → release no GitHub → URL → Firebase
 *   - Mantido como fallback para quando não há acesso ao Actions
 */
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { createRelease, getReleaseByTag, triggerWorkflow, uploadReleaseAsset } from '../../services/github'
import { updateGreenhouseNode } from '../../services/rtdb'

// ─── Estilos inline (escopo isolado, sem conflito com o CSS existente) ────────
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
  tabs: {
    display: 'flex', borderBottom: '1px solid var(--border, #2a2a4a)',
  },
  tab: (active) => ({
    flex: 1, padding: '0.75rem 1rem', border: 'none', cursor: 'pointer',
    background: 'none', fontSize: '0.8rem', fontWeight: active ? 600 : 400,
    color: active ? 'var(--accent, #7c7cff)' : 'var(--text-muted, #888)',
    borderBottom: active ? '2px solid var(--accent, #7c7cff)' : '2px solid transparent',
    transition: 'all 0.15s', marginBottom: '-1px',
  }),
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

// ─── Aba 1: Disparar workflow GitHub Actions ──────────────────────────────────
function ActionsTab({ greenhouseId, ota }) {
  const [version, setVersion]   = useState('')
  const [token, setToken]       = useState(localStorage.getItem('ifungi_github_token') || '')
  const [repo, setRepo]         = useState(localStorage.getItem('ifungi_repo') || '')
  const [firmwareUrl, setFirmwareUrl] = useState('')
  const [loading, setLoading]   = useState(false)
  const [dispatched, setDispatched] = useState(false)

  const saveLocally = () => {
    localStorage.setItem('ifungi_github_token', token)
    localStorage.setItem('ifungi_repo', repo)
  }

  const dispatch = async () => {
    if (!version || !token || !repo || !firmwareUrl) {
      toast.error('Preencha todos os campos')
      return
    }
    if (!firmwareUrl.startsWith('https://')) {
      toast.error('URL do firmware deve começar com https://')
      return
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      toast.error('Versão inválida. Use formato X.Y.Z')
      return
    }

    saveLocally()
    setLoading(true)
    try {
      await triggerWorkflow(token, repo, {
        version,
        greenhouse_id: greenhouseId,
        firmware_url: firmwareUrl,
        release_repo: repo,
      })
      setDispatched(true)
      toast.success('Workflow disparado! Acompanhe em Actions no GitHub.')
    } catch (err) {
      const msg = err?.response?.data?.message || err.message
      toast.error(`Falha ao disparar workflow: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (dispatched) {
    return (
      <div style={S.body}>
        <div style={{ ...S.infoBox, borderColor: '#22c55e33', background: '#052e1633', textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#4ade80' }}>Workflow disparado!</div>
          <div style={{ fontSize: '0.75rem' }}>
            Acompanhe o progresso em <strong>Actions</strong> no repositório <code style={{ fontSize: '0.7rem' }}>{repo}</code>.
            O ESP32 receberá o OTA em até 60 segundos após a conclusão.
          </div>
        </div>
        <button style={S.btnSecondary} onClick={() => setDispatched(false)}>Disparar novamente</button>
      </div>
    )
  }

  return (
    <div style={S.body}>
      <div style={S.infoBox}>
        <strong>Fluxo automático via GitHub Actions</strong><br />
        O workflow baixa o <code>.bin</code>, cria uma release no GitHub, faz upload
        e atualiza o Firebase automaticamente. O ESP32 detecta a atualização em até 60s.
      </div>

      <div style={S.field}>
        <label style={S.label}>PAT GitHub (actions:write + contents:write)</label>
        <input
          style={S.input} type="password" placeholder="ghp_..."
          value={token} onChange={e => setToken(e.target.value)}
        />
        <span style={S.hint}>Salvo apenas no navegador. Necessário para disparar o workflow.</span>
      </div>

      <div style={S.field}>
        <label style={S.label}>Repositório de releases</label>
        <input
          style={S.input} placeholder="usuario/IFUNGI-OTA-UPDATES"
          value={repo} onChange={e => setRepo(e.target.value)}
        />
      </div>

      <div style={S.field}>
        <label style={S.label}>Versão do firmware</label>
        <input
          style={S.input} placeholder="1.2.5"
          value={version} onChange={e => setVersion(e.target.value)}
        />
      </div>

      <div style={S.field}>
        <label style={S.label}>URL direta do firmware (.bin)</label>
        <input
          style={S.input} placeholder="https://example.com/firmware.bin"
          value={firmwareUrl} onChange={e => setFirmwareUrl(e.target.value)}
        />
        <span style={S.hint}>
          Qualquer URL HTTPS acessível publicamente. O workflow fará o download desta URL.
        </span>
      </div>

      <div style={S.field}>
        <label style={S.label}>Estufa alvo</label>
        <div style={S.codeBlock}>{greenhouseId}</div>
      </div>

      {ota?.version && (
        <div style={S.statusRow}>
          <div style={S.dot('#22c55e')} />
          <span>Versão instalada: <strong>{ota.lastInstalledVersion || ota.version || '—'}</strong></span>
        </div>
      )}

      <button
        style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
        onClick={dispatch} disabled={loading}
      >
        {loading ? 'Disparando workflow…' : '🚀 Disparar GitHub Actions'}
      </button>
    </div>
  )
}

// ─── Aba 2: Upload manual pelo navegador ──────────────────────────────────────
function BrowserTab({ greenhouseId, ota }) {
  const [version, setVersion]   = useState('')
  const [token, setToken]       = useState(localStorage.getItem('ifungi_github_token') || '')
  const [repo, setRepo]         = useState(localStorage.getItem('ifungi_repo') || '')
  const [file, setFile]         = useState(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading]   = useState(false)

  const onDrop = useCallback((accepted) => {
    const f = accepted?.[0]
    if (!f) return
    if (!f.name.endsWith('.bin')) { toast.error('Use um arquivo .bin'); return }
    setFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
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
    try {
      const tag = `v${version}`
      const existing = await getReleaseByTag(token, repo, tag)
      if (existing) {
        toast.error(`Release ${tag} já existe no GitHub. Use outra versão.`)
        return
      }

      const release = await createRelease(token, repo, tag,
        `IFungi Firmware ${tag} — publicado via navegador em ${new Date().toISOString()}`)

      // Renomeia o arquivo para firmware.bin no upload
      const renamedFile = new File([file], 'firmware.bin', { type: file.type })
      const asset = await uploadReleaseAsset(token, release.upload_url, renamedFile, setProgress)
      const downloadUrl = asset.browser_download_url

      await updateGreenhouseNode(greenhouseId, 'ota', {
        available: true,
        version,
        url: downloadUrl,
        notes: `Publicado via navegador em ${new Date().toLocaleString('pt-BR')}`,
      })

      toast.success('OTA publicada e Firebase atualizado!')
      setFile(null)
      setProgress(0)
      setVersion('')
    } catch (err) {
      const msg = err?.response?.data?.message || err.message
      toast.error(msg || 'Falha ao publicar OTA')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.body}>
      <div style={{ ...S.infoBox, borderColor: '#f59e0b33', background: '#1c150533' }}>
        <strong>⚠ Upload direto pelo navegador</strong><br />
        Fallback para testes. Pode falhar por CORS ou limites do GitHub. 
        Para produção, prefira a aba <em>GitHub Actions</em>.
      </div>

      <div style={S.field}>
        <label style={S.label}>PAT GitHub (contents:write)</label>
        <input style={S.input} type="password" placeholder="ghp_..."
          value={token} onChange={e => setToken(e.target.value)} />
      </div>

      <div style={S.field}>
        <label style={S.label}>Repositório de releases</label>
        <input style={S.input} placeholder="usuario/IFUNGI-OTA-UPDATES"
          value={repo} onChange={e => setRepo(e.target.value)} />
      </div>

      <div style={S.field}>
        <label style={S.label}>Versão</label>
        <input style={S.input} placeholder="1.2.5"
          value={version} onChange={e => setVersion(e.target.value)} />
      </div>

      <div style={S.field}>
        <label style={S.label}>Arquivo firmware (.bin)</label>
        <div style={S.dropzone(isDragActive)} {...getRootProps()}>
          <input {...getInputProps()} />
          {isDragActive
            ? '📂 Solte o arquivo aqui'
            : file
              ? `✅ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
              : '📁 Arraste o .bin ou clique para selecionar'}
        </div>
      </div>

      {loading && (
        <div>
          <div style={{ ...S.statusRow, marginBottom: '0.4rem' }}>
            <div style={S.dot('#a78bfa')} />
            <span>Enviando… {progress}%</span>
          </div>
          <div style={S.progress}>
            <div style={S.progressBar(progress)} />
          </div>
        </div>
      )}

      {ota?.lastInstalledVersion && (
        <div style={S.statusRow}>
          <div style={S.dot('#22c55e')} />
          <span>Versão instalada: <strong>{ota.lastInstalledVersion}</strong></span>
        </div>
      )}

      <button
        style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
        onClick={publish} disabled={loading}
      >
        {loading ? `Publicando… ${progress}%` : '📤 Publicar OTA'}
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OTAModal({ greenhouseId, ota = {} }) {
  const [open, setOpen]   = useState(false)
  const [tab, setTab]     = useState('actions')

  const isAvailable = Boolean(ota?.available)

  return (
    <>
      {/* Botão de abertura */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Atualização de Firmware (OTA)</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
            {isAvailable
              ? <span style={{ color: '#f59e0b' }}>⏳ Atualização pendente: v{ota.version}</span>
              : ota.lastInstalledVersion
                ? `Instalada: v${ota.lastInstalledVersion}`
                : 'Nenhuma atualização pendente'}
          </div>
        </div>
        <button onClick={() => setOpen(true)}>Publicar OTA</button>
      </div>

      {/* Modal */}
      {open && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={S.modal}>

            {/* Header */}
            <div style={S.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={S.title}>Publicar Firmware OTA</span>
                <span style={S.badge}>{greenhouseId}</span>
              </div>
              <button style={S.closeBtn} onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* Tabs */}
            <div style={S.tabs}>
              <button style={S.tab(tab === 'actions')} onClick={() => setTab('actions')}>
                🤖 GitHub Actions
              </button>
              <button style={S.tab(tab === 'browser')} onClick={() => setTab('browser')}>
                🖥 Navegador
              </button>
            </div>

            {/* Conteúdo da aba */}
            {tab === 'actions'
              ? <ActionsTab greenhouseId={greenhouseId} ota={ota} />
              : <BrowserTab greenhouseId={greenhouseId} ota={ota} />
            }

            {/* Footer */}
            <div style={S.footer}>
              <button style={S.btnSecondary} onClick={() => setOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
