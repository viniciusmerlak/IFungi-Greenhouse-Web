IFungi AI Desktop - Release and OTA (GitHub Releases)

Overview

This document explains how the free, self-hosted OTA works using GitHub Releases and how to publish new releases.

Requirements

- Public GitHub repository (releases must be public for automatic updates without additional tokens)
- GitHub Actions enabled

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
