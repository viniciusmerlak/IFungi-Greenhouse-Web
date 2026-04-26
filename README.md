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

## OTA via GitHub Actions (recomendado)

O workflow `.github/workflows/publish-ota.yml` automatiza:

1. download do `firmware.bin` a partir de uma URL direta;
2. criacao de release/tag no GitHub;
3. upload do `firmware.bin` no release;
4. atualizacao de `greenhouses/{greenhouse_id}/ota` no Firebase com a URL final.

### Secrets necessarios

Configure em `Settings > Secrets and variables > Actions`:

- `OTA_GITHUB_TOKEN`: PAT com permissao para criar release no repositorio de OTA;
- `FIREBASE_DATABASE_URL`: ex. `https://pfi-ifungi-default-rtdb.firebaseio.com`;
- `FIREBASE_DB_SECRET`: segredo/token para escrita REST no Realtime Database.

### Como executar o workflow

No GitHub:

1. abra `Actions > Publish OTA Firmware`;
2. clique em `Run workflow`;
3. preencha:
   - `version` (ex. `1.1.2`)
   - `greenhouse_id` (ex. `IFUNGI-EC:62:60:99:E7:0C`)
   - `firmware_url` (link direto do `.bin`)
   - `release_repo` (ex. `viniciusmerlak/IFUNGI-OTA-UPDATES`)

Ao final, o workflow exibe no resumo a URL final do firmware publicada no release.

## OTA manual pelo navegador (fallback)

Existe fluxo manual na UI para testes, mas nao e o fluxo recomendado para producao porque depende de token no browser e pode sofrer com erros de configuracao/CORS.
