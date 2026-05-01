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

## Pipeline OTA (modo unico, pelo navegador)

A publicacao OTA e feita inteiramente pelo navegador, em uma unica pipeline:

1. usuario seleciona o `.bin` via drag & drop e informa versao + repositorio;
2. o painel verifica se a tag `vX.Y.Z` ja existe no GitHub;
3. cria uma release no repositorio configurado;
4. faz upload do `.bin` como asset com nome `firmware.bin` (NAO zipado), de forma
   que a `browser_download_url` retornada termina em `/firmware.bin`;
5. grava em `greenhouses/{greenhouse_id}/ota` no Firebase Realtime Database:

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

### Token GitHub

Necessario um Personal Access Token (PAT) com permissao `contents:write` no
repositorio de releases (ex.: `viniciusmerlak/IFUNGI-OTA-UPDATES`). O token e
armazenado apenas no `localStorage` do navegador.
