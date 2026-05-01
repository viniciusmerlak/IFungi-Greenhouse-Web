# IFungi Greenhouse Web

Painel web para login, visualizacao de sensores/atuadores e publicacao de atualizacoes OTA.

## Rodando localmente

```bash
npm install
npm run dev
```

Aplicacao local: `http://localhost:5173`

## Variaveis de ambiente

Crie um arquivo `.env` baseado em `.env.example`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

> Os workflows de Firebase Hosting NAO injetam essas envs durante a build. Para
> que o app deployado funcione, replique-as como secrets `VITE_FIREBASE_*` no
> repositorio (`Settings > Secrets and variables > Actions`) e adicione um passo
> `env:` antes do `npm run build` nos workflows `.github/workflows/firebase-hosting-*.yml`.

## Pipeline OTA (single browser flow, 100% gratuito)

A publicacao OTA e iniciada inteiramente pelo navegador. Como o GitHub nao
suporta CORS no endpoint de upload (`uploads.github.com`), o asset e enviado
server-side por uma GitHub Action; o navegador apenas dispara e acompanha.
A pipeline nao usa Firebase Storage nem qualquer servico pago: o `.bin` e
enviado para a propria API do GitHub (Git blob) que suporta CORS.

```text
[Navegador]
  | (1) le .bin, base64-encode
  | (2) POST /repos/{source}/git/blobs (api.github.com -> CORS OK) -> staging_sha
  | (3) workflow_dispatch publish-ota.yml { version, staging_sha, target_repo, run_seed }
  v
[GitHub Actions runner]
  | (4) GET /repos/{source}/git/blobs/{sha} -> firmware.bin (valida tamanho + magic 0xE9)
  | (5) POST /repos/{target}/releases (cria release v{version})
  | (6) POST uploads.github.com/.../assets?name=firmware.bin (sobe asset, server-side)
  v
[Navegador] (poll do run termina com success)
  | (7) GET /repos/{target}/releases/tags/v{version}
  | (8) RTDB greenhouses/{id}/ota.set({ available, version, url, notes, lastPublishedAt })
```

O Git blob criado no passo 2 nao e referenciado por nenhum commit (dangling
object) e e removido pelo garbage collector do GitHub no proximo ciclo, sem
poluir o historico do repositorio.

Schema gravado em `greenhouses/{greenhouse_id}/ota`:

```json
{
  "available": true,
  "version": "1.2.5",
  "url": "https://github.com/<owner>/<repo>/releases/download/v1.2.5/firmware.bin",
  "notes": "Publicado em <data>",
  "lastPublishedAt": 1777645282
}
```

O ESP32 le esse no e baixa o firmware diretamente da URL.

### Tokens e secrets necessarios

- **PAT do navegador** (input no formulario, guardado em `localStorage`):
  PAT com `contents: write` (criar Git blob) e `actions: write` (disparar
  workflow), ambos em `viniciusmerlak/IFungi-Greenhouse-Web`.
- **Secret `OTA_GITHUB_TOKEN`** (em `Settings > Secrets > Actions` deste repo):
  PAT com `contents: write` no repo de releases (ex.: `viniciusmerlak/IFUNGI-OTA-UPDATES`).
  Usado pelo workflow para criar a release e subir o asset.

### Workflow

Arquivo: `.github/workflows/publish-ota.yml`. Trigger: `workflow_dispatch`.
Inputs: `version`, `staging_sha`, `target_repo`, `run_seed`. Lembre que o
GitHub indexa workflows pelo arquivo na branch padrao -- por isso o YAML
precisa estar em `main` para que o navegador consiga dispatchar via API.
