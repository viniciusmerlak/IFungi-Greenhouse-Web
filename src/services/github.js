/**
 * @file github.js
 * @brief Serviço de integração com a API do GitHub
 *
 * Funções:
 *  - getReleaseByTag     : verifica se uma release/tag já existe
 *  - createRelease       : cria uma nova release
 *  - uploadReleaseAsset  : faz upload de um asset (.bin) para uma release
 *  - triggerWorkflow     : dispara o workflow publish-ota.yml via workflow_dispatch
 *
 * NOTA sobre triggerWorkflow:
 *  Usa POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
 *  O PAT precisa ter permissão `actions:write` além de `contents:write`.
 *  O workflow deve estar no branch padrão (main/master) e ter
 *  `on: workflow_dispatch` com os inputs definidos.
 */

import axios from 'axios'

const githubApi = (token) =>
  axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })

function normalizeRepoFullName(repoInput) {
  const value = String(repoInput || '').trim().replace(/\/+$/, '')
  if (!value) return ''

  const fromUrl = value.match(/github\.com\/([^/]+\/[^/]+)$/i)
  if (fromUrl?.[1]) return fromUrl[1]

  const withoutProtocol = value.replace(/^https?:\/\//i, '')
  if (/^[^/]+\/[^/]+$/.test(withoutProtocol)) return withoutProtocol

  return value
}

export async function getReleaseByTag(token, repoFullName, tag) {
  try {
    const client = githubApi(token)
    const repo = normalizeRepoFullName(repoFullName)
    const { data } = await client.get(`/repos/${repo}/releases/tags/${tag}`)
    return data
  } catch {
    return null
  }
}

export async function createRelease(token, repoFullName, tagName, body = '') {
  const client = githubApi(token)
  const repo = normalizeRepoFullName(repoFullName)
  const { data } = await client.post(`/repos/${repo}/releases`, {
    tag_name: tagName,
    name: `IFungi Firmware ${tagName}`,
    body,
    draft: false,
    prerelease: false,
  })
  return data
}

export async function uploadReleaseAsset(token, uploadUrl, file, onProgress) {
  const cleanUrl = uploadUrl.replace('{?name,label}', '')
  const { data } = await axios.post(`${cleanUrl}?name=firmware.bin`, file, {
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/octet-stream',
      Accept: 'application/vnd.github+json',
    },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded * 100) / event.total))
      }
    },
  })
  return data
}

/**
 * Dispara o workflow publish-ota.yml via API REST do GitHub (workflow_dispatch).
 *
 * @param {string} token        PAT com actions:write + contents:write
 * @param {string} repoFullName Repositório onde o workflow está (ex: "usuario/IFUNGI-OTA-UPDATES")
 * @param {object} inputs       Inputs do workflow:
 *   - version        {string}  ex: "1.2.5"
 *   - greenhouse_id  {string}  ex: "IFUNGI-EC:62:60:99:E7:0C"
 *   - firmware_url   {string}  URL HTTPS do .bin
 *   - release_repo   {string}  Repositório de releases (mesmo repo ou outro)
 * @param {string} [ref='main'] Branch/tag onde o workflow está definido
 *
 * @throws {Error} Se o dispatch falhar (token inválido, workflow não encontrado, etc.)
 */
export async function triggerWorkflow(token, repoFullName, inputs, ref = 'main') {
  const client = githubApi(token)
  const repo = normalizeRepoFullName(repoFullName)

  // O nome do arquivo do workflow deve corresponder ao que está em .github/workflows/
  const workflowId = 'publish-ota.yml'

  await client.post(`/repos/${repo}/actions/workflows/${workflowId}/dispatches`, {
    ref,
    inputs: {
      version:      String(inputs.version),
      greenhouse_id: String(inputs.greenhouse_id),
      firmware_url: String(inputs.firmware_url),
      release_repo: String(inputs.release_repo || repoFullName),
    },
  })

  // workflow_dispatch retorna 204 No Content em sucesso — sem body para retornar
  return true
}
