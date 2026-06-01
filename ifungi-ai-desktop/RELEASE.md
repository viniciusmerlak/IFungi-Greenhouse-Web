IFungi AI Desktop - Release and OTA (GitHub Releases)

Overview

This document explains how the free, self-hosted OTA works using GitHub Releases and how to publish new releases.

Requirements

- Public GitHub repository (releases must be public for automatic updates without additional tokens)
- GitHub Actions enabled
- Desktop publish target configured in `ifungi-ai-desktop/package.json`:
  `viniciusmerlak/IFungi-Greenhouse-Web`
- For local publishing, a `GH_TOKEN`/`GITHUB_TOKEN` with `repo` permission

Windows locked-screen behavior

- The packaged app starts with Windows login and keeps running when the main window is closed.
- The app starts a `powerSaveBlocker` so Windows does not suspend the desktop session while the scheduler is armed.
- Scheduled capture can run while the Windows session is locked, as long as the notebook is powered on, the user session is logged in, Windows has not been put to sleep/hibernate, and the camera remains available to the logged-in session. No desktop app can take a webcam photo after the machine is fully powered off or asleep.

Build commands

From PowerShell:

```powershell
cd C:\Users\vinic\OneDrive\Documentos\github\IFungi-Greenhouse-Web\ifungi-ai-desktop
npm ci
npm run typecheck
npm run electron:build
npm run release:local
```

The local installer/portable `.exe` files are generated in:

```text
ifungi-ai-desktop\release\
```

To publish a release that OTA can detect:

```powershell
cd C:\Users\vinic\OneDrive\Documentos\github\IFungi-Greenhouse-Web\ifungi-ai-desktop
$env:GH_TOKEN="ghp_SEU_TOKEN_AQUI"
npm ci
npm run release:ci
```

The GitHub release must contain `latest.yml`; this is the metadata read by `electron-updater`.

Optional Windows Task Scheduler backup

Use this if you want Windows to relaunch the app at logon even if startup registration was removed:

```powershell
$exe = "$env:LOCALAPPDATA\Programs\IFungi AI Desktop\IFungi AI Desktop.exe"
schtasks /Create /TN "IFungi AI Desktop" /TR "`"$exe`" --hidden" /SC ONLOGON /RL LIMITED /F
```

Publishing via GitHub Actions

1. Create a tag like `v1.2.3` and push it to GitHub:

   git tag v1.2.3
   git push origin v1.2.3

2. The workflow `.github/workflows/release.yml` will build the app and publish the installer and metadata to GitHub Releases.

Local packaging

- Use `./release.sh` inside `ifungi-ai-desktop` (Git Bash/WSL on Windows) to build installer artifacts without publishing.

OTA behavior

- The app checks for updates on startup and every 6 hours.
- Downloads occur in background and are installed on restart.
- Update events and progress are exposed to the renderer via preload bridge and a small UI component.
- Logs are written to `%APPDATA%/IFungi AI Desktop/logs/main.log` to assist diagnostics.

Security

- `contextIsolation` is enabled and `nodeIntegration` is disabled.
- The preload bridge provides a limited IPC surface for updates only.

Notes

- electron-builder's GitHub provider will create `latest.yml` and blockmap files in the release; electron-updater reads these to perform differential updates.
- For public repositories no additional configuration is required in the client; the build publish step uses the `GITHUB_TOKEN` provided by Actions.
