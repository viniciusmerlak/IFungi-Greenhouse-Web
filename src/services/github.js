/**
 * @file github.js
 * @brief Servico de integracao com a API do GitHub.
 *
 * O upload do `.bin` em `uploads.github.com` nao suporta CORS, portanto a
 * publicacao da release acontece em GitHub Actions. O navegador apenas:
 *   - dispara o workflow (`triggerWorkflowDispatch`)
 *   - acompanha o run (`findRecentWorkflowRun`, `getWorkflowRun`)
 *   - le a release publicada (`getReleaseByTag`)
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
