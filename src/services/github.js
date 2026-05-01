/**
 * @file github.js
 * @brief Servico de integracao com a API do GitHub.
 *
 * Como `uploads.github.com` (asset upload) nao envia headers CORS, todo o
 * fluxo do navegador acontece via `api.github.com`, que suporta CORS:
 *   - `createBlob`: faz upload do `.bin` como Git blob no repo da pipeline
 *     (objeto dangling, garbage-coletado pelo GitHub)
 *   - `triggerWorkflowDispatch`: dispara o workflow `publish-ota.yml` que,
 *     server-side, baixa o blob e publica a release com o asset
 *   - `findRecentWorkflowRun`/`getWorkflowRun`: polling do run
 *   - `getReleaseByTag`: le a release final ja publicada
 */

import axios from 'axios'

const githubApi = (token) =>
  axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

/**
 * Cria um Git blob com o conteudo base64 e retorna o SHA. O blob nao e
 * referenciado por nenhum commit (dangling object) e o GitHub fara GC dele
 * eventualmente. Usado como buffer temporario para passar o `.bin` ao
 * workflow sem depender de upload direto (CORS) ou storage externa.
 *
 * Endpoint: POST /repos/{owner}/{repo}/git/blobs (api.github.com -> CORS OK).
 * Permissao necessaria no PAT: contents:write no `repo`.
 */
export async function createBlob(token, repo, base64Content) {
  const client = githubApi(token)
  const r = normalizeRepoFullName(repo)
  const { data } = await client.post(`/repos/${r}/git/blobs`, {
    content: base64Content,
    encoding: 'base64',
  })
  return data.sha
}

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

export async function triggerWorkflowDispatch(token, sourceRepo, workflowFile, ref, inputs) {
  const client = githubApi(token)
  const repo = normalizeRepoFullName(sourceRepo)
  await client.post(`/repos/${repo}/actions/workflows/${workflowFile}/dispatches`, {
    ref,
    inputs,
  })
}

export async function findRecentWorkflowRun(token, sourceRepo, workflowFile, sinceIso, runSeed) {
  const client = githubApi(token)
  const repo = normalizeRepoFullName(sourceRepo)
  const { data } = await client.get(
    `/repos/${repo}/actions/workflows/${workflowFile}/runs`,
    { params: { event: 'workflow_dispatch', per_page: 20, created: `>=${sinceIso}` } },
  )
  const runs = data?.workflow_runs || []
  if (!runSeed) return runs[0] || null
  return (
    runs.find(
      (r) => (r.display_title || '').includes(runSeed) || (r.name || '').includes(runSeed),
    ) || null
  )
}

export async function getWorkflowRun(token, sourceRepo, runId) {
  const client = githubApi(token)
  const repo = normalizeRepoFullName(sourceRepo)
  const { data } = await client.get(`/repos/${repo}/actions/runs/${runId}`)
  return data
}
