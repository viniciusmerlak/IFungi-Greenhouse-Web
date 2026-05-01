/**
 * @file github.js
 * @brief Servico de integracao com a API do GitHub (releases).
 *
 * Funcoes:
 *  - getReleaseByTag     : verifica se uma release/tag ja existe
 *  - createRelease       : cria uma nova release
 *  - uploadReleaseAsset  : faz upload de um asset (.bin) para uma release
 *
 * O upload sempre define o nome do asset como `firmware.bin`, garantindo
 * que `browser_download_url` retorne uma URL terminando em `.bin`.
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
