#!/usr/bin/env bash
# Script de release para IFungi AI Desktop
# Requer: Node.js, npm, Git Bash ou WSL no Windows
set -euo pipefail
cd "$(dirname "$0")"

# ─────────────────────────────────────────────────────────────────
# Verifica GH_TOKEN (obrigatório para OTA via GitHub Releases)
# ─────────────────────────────────────────────────────────────────
if [ -z "${GH_TOKEN:-}" ]; then
  echo ""
  echo "❌  ERRO: GH_TOKEN não está definido."
  echo ""
  echo "    O electron-updater (OTA) precisa publicar o executável e o"
  echo "    arquivo latest.yml no GitHub Releases para funcionar."
  echo ""
  echo "    Como gerar o token:"
  echo "    1. Acesse: https://github.com/settings/tokens"
  echo "    2. Clique em 'Generate new token (classic)'"
  echo "    3. Marque a permissão: repo"
  echo "    4. Adicione ao seu .env:  GH_TOKEN=ghp_xxxx"
  echo "    5. Execute:  source .env && bash release.sh"
  echo ""
  exit 1
fi

# ─────────────────────────────────────────────────────────────────
# Verifica que package.json não tem o placeholder do repositório
# ─────────────────────────────────────────────────────────────────
if grep -q "SEU_USUARIO" package.json; then
  echo ""
  echo "❌  ERRO: package.json ainda contém o placeholder SEU_USUARIO/SEU_REPO."
  echo ""
  echo "    Edite package.json e substitua:"
  echo "      \"url\": \"https://github.com/SEU_USUARIO/SEU_REPO.git\""
  echo "      \"owner\": \"SEU_USUARIO\""
  echo "      \"repo\":  \"SEU_REPO\""
  echo "    pelos valores reais do seu repositório."
  echo ""
  exit 1
fi

echo "✅  GH_TOKEN encontrado."
echo "✅  Repositório configurado."
echo ""

# ─────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────
echo "📦  Instalando dependências..."
npm ci

echo "🔨  Compilando TypeScript + Vite + electron-builder..."
# Publica automaticamente no GitHub Releases
# Gera: .exe (NSIS + portable) + latest.yml  ← o latest.yml é o que faz o OTA funcionar
npm run release:ci

echo ""
echo "✅  Release publicada com sucesso!"
echo "    Verifique em: https://github.com/$(node -p "require('./package.json').repository.url.match(/github.com\/(.+)\.git/)?.[1] ?? 'SEU_USUARIO/SEU_REPO'")/releases"
echo ""
echo "    Arquivos esperados na release:"
echo "      • IFungi AI Desktop-Setup-<versao>.exe   ← instalador"
echo "      • IFungi AI Desktop-<versao>-portable.exe ← portátil"
echo "      • latest.yml                              ← OBRIGATÓRIO para OTA"
