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

## Pipeline OTA (single browser flow + GitHub Actions)

A publicacao OTA e iniciada inteiramente pelo navegador. Como o GitHub nao
suporta CORS no endpoint de upload (`uploads.github.com`), o asset e enviado
server-side por uma GitHub Action; o navegador apenas dispara e acompanha.

```text
[Navegador]
  | (1) upload .bin -> Firebase Storage (ota-staging/{id}/{ts}.bin)
  | (2) workflow_dispatch publish-ota.yml { version, file_url, target_repo, run_seed }
  v
[GitHub Actions runner]
  | (3) curl file_url -> firmware.bin
  | (4) POST /repos/{target}/releases (cria release v{version})
  | (5) POST uploads.github.com/.../assets?name=firmware.bin (sobe asset)
  v
[Navegador] (poll do run termina com success)
  | (6) GET /repos/{target}/releases/tags/v{version}
  | (7) RTDB greenhouses/{id}/ota.set({ available, version, url, notes, lastPublishedAt })
  | (8) deleta ota-staging/{id}/{ts}.bin
```

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

- **PAT do navegador** (input no formulario, guardado em `localStorage`): precisa de
  permissao `actions: write` no repositorio fonte (`viniciusmerlak/IFungi-Greenhouse-Web`)
  para disparar o workflow.
- **Secret `OTA_GITHUB_TOKEN`** (em `Settings > Secrets > Actions` deste repo):
  PAT com `contents: write` no repo de releases (ex.: `viniciusmerlak/IFUNGI-OTA-UPDATES`).
  Usado pelo workflow para criar a release e subir o asset.

### Storage rules

`storage.rules` permite escrita autenticada em `ota-staging/{id}/*.bin` e leitura
publica (necessario para o runner do GitHub Actions baixar via download URL).

Deploy:

```bash
npx firebase-tools@latest deploy --only storage --project pfi-ifungi
```

### Workflow

Arquivo: `.github/workflows/publish-ota.yml`. Trigger: `workflow_dispatch`.
Inputs: `version`, `file_url`, `target_repo`, `run_seed`.
