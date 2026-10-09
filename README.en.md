<p align="center">
  <img src="build/icon.png" width="112" alt="radish-security-notes icon">
</p>

<h1 align="center">radish-security-notes</h1>

<p align="center">A local-first, encrypted desktop vault for passwords and notes. No server, no account, your data never leaves your computer.</p>

<p align="center">
  <a href="https://github.com/auYeCoding/radish-security-notes/actions/workflows/ci.yml"><img src="https://github.com/auYeCoding/radish-security-notes/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/auYeCoding/radish-security-notes/releases/latest"><img src="https://img.shields.io/github/v/release/auYeCoding/radish-security-notes?label=release" alt="Latest release"></a>
  <a href="https://github.com/auYeCoding/radish-security-notes/releases"><img src="https://img.shields.io/github/downloads/auYeCoding/radish-security-notes/total" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-Windows-0078D6" alt="Platform: Windows">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center"><a href="README.md">简体中文</a> | <b>English</b></p>

---

radish-security-notes keeps passwords, keys, identity details and private notes in a fully encrypted local database. Everyday use needs no network connection. The interface is available in Simplified Chinese and English, with light, dark and follow-system themes.

> Only Windows builds are packaged and verified. The macOS and Linux targets in the build scripts come from the project template and are untested.

## Contents

- [Features](#features)
- [Download and install](#download-and-install)
- [Before you rely on it](#before-you-rely-on-it)
- [Development](#development)
- [Releasing](#releasing)
- [License](#license)

## Features

**Vault and security**

- The whole database is encrypted with SQLCipher 4, using a randomly generated 256-bit data key.
- The data key is protected by your master password (derived with Argon2id). You can also skip the master password and let the operating system protect the key (Electron `safeStorage`).
- First-time setup gives you 24 recovery words (BIP39) that restore access if you forget the master password or lose the key file. See [Recovery key](docs/恢复密钥.md) (in Chinese).
- Auto-lock: the vault locks after an idle period, on screen lock and on system sleep.
- Content protection: screenshots, screen recorders and screen sharing cannot capture the window.
- Packaged builds turn off Electron's debugging entry points (`ELECTRON_RUN_AS_NODE`, Node inspector arguments, `NODE_OPTIONS`), load code only from the asar archive and validate its integrity.

**Entries**

- 12 built-in types: login, forum account, database, server, bank card, crypto wallet, API key, software license, secure note, Wi-Fi credentials, SSH key and identity. You can define your own types and fields.
- Notes in plain text or Markdown, with TOTP codes and attachments (images can be previewed).
- Folders (drag and drop), tags, search (name, account, notes, URL, custom fields and tag names), and batch move, tag, untag and delete.

**Import, export and backup**

- Import: Bitwarden (JSON and CSV), browser passwords (CSV), KeePassXC (CSV).
- Export: the app's own complete format (ZIP), Bitwarden (JSON), browser passwords (CSV), optionally encrypted with a passphrase.
- Email backup: send all your data to your own mailbox. QQ Mail, 163 Mail, Gmail, Outlook and custom SMTP are supported, and backups can run on a schedule.
- Restore from backup: pick a backup file, preview it, confirm, restore.

## Download and install

Get the latest build from the [Releases](https://github.com/auYeCoding/radish-security-notes/releases/latest) page and pick one of the two:

| File                                           | Description                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `radish-security-notes-<version>-setup.exe`    | Installer. A setup wizard that lets you choose the install location and adds shortcuts. |
| `radish-security-notes-<version>-portable.exe` | Portable. A single file that runs without installing and does not touch the registry.   |

Both builds have the same features and share the same data (see [Before you rely on it](#before-you-rely-on-it)). The portable build unpacks itself on every launch, so it starts a little slower.

Neither file is code-signed yet, so Windows SmartScreen shows "Windows protected your PC". Choose "More info", then "Run anyway". To check that the download is intact, compare it with `SHA256SUMS.txt` on the release page:

```powershell
Get-FileHash .\radish-security-notes-<version>-setup.exe -Algorithm SHA256
```

## Before you rely on it

- Your data lives in Electron's user data directory (`%APPDATA%\radish-security-notes` on Windows). The installer build and the portable build both use it. Uninstalling the app or deleting the portable file does not remove it, and the portable build does not carry your data to another computer along with the exe.
- Before switching computers or reinstalling Windows, make an export or an email backup.
- If you forget the master password and lose the 24 recovery words, the data cannot be recovered. There is no back door.
- The recovery words are a master key. Keep them offline, do not store them in the vault and do not send them with an email backup. The current version cannot rotate them.
- Email backup sends an encrypted or unencrypted backup file to the mailbox you configure. The mail authorization code is stored only in the encrypted local vault. An unencrypted backup contains every password, so turning on passphrase encryption is recommended.
- This project has not had a third-party security audit. Evaluate it against your own needs before use.

## Development

Requirements: Node.js 22.12 or later (developed on Node 24).

```bash
npm install

# Since Electron 42, npm install no longer downloads the Electron binary. Download it once.
npx install-electron

npm run dev
```

Common commands:

| Command             | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `npm run dev`       | Start the development environment                                         |
| `npm run lint`      | ESLint and Stylelint                                                      |
| `npm run typecheck` | Type-check the main-process and renderer projects                         |
| `npm test`          | Run all tests (Vitest)                                                    |
| `npm run build`     | Type-check and build                                                      |
| `npm run build:win` | Build and package the Windows installer and portable build (into `dist/`) |
| `npm run format`    | Format with Prettier                                                      |

Tech stack: Electron, React 19, TypeScript, Tailwind CSS 4, Base UI and shadcn, zustand, react-hook-form and zod, Drizzle ORM and better-sqlite3-multiple-ciphers, i18next, Vitest.

Layout:

```text
src/main       Main process: vault, database, import and export, email backup, windows and system integration
src/preload    Preload script exposing a restricted bridge to the renderer
src/renderer   Renderer: interface, state and interaction
src/shared     Types, rules and copy shared by the main process and the renderer
docs           Design documents
```

Design documents (in Chinese):

- [Recovery key](docs/恢复密钥.md): how the recovery words work, setup, recovery and safety notes.
- [Design language](docs/设计语言.md): colors, contrast, typography, spacing and motion.
- [Frontend skeleton](docs/前端骨架方案.md): frontend choices, layout, token structure, theming and internationalization.

Code comments and commit messages are written in Chinese.

## Releasing

Pushing a tag such as `v1.2.3` triggers the [Release workflow](.github/workflows/release.yml): it runs the tests on Windows, packages the installer and the portable build, and publishes them to Releases together with `SHA256SUMS.txt`. The tag must match `version` in `package.json`, otherwise the workflow fails.

```bash
npm version patch
git push --follow-tags
```

## License

[MIT](LICENSE)
