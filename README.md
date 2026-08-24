# Embedded32Bot

GitHub App that automates maintenance for [Embedded32](https://github.com/Mukesh-SCS/Embedded32).

The bot is built incrementally. This repository currently provides the TypeScript/Probot foundation and one working command.

## Current capabilities

- `@embedded32bot help` on a pull request comment replies with the list of supported commands.

## Requirements

- Node.js >= 20.18
- npm
- GitHub App credentials for local webhook testing

## Install

```bash
npm ci
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Run locally

1. Copy `.env.example` to `.env`.
2. Create a GitHub App (or start the app once and use Probot's setup page at `http://localhost:3000`).
3. Set `APP_ID`, `PRIVATE_KEY` or `PRIVATE_KEY_PATH`, and `WEBHOOK_SECRET`.
4. For local webhook delivery, start a [smee.io](https://smee.io) channel and set `WEBHOOK_PROXY_URL`.
5. Build and start:

```bash
npm run build
npm start
```

`npm run dev` builds and then starts the same way. After code changes, rebuild before restarting.

Install the GitHub App on `Mukesh-SCS/Embedded32`. The app listens for `issue_comment` events and currently only acts on that repository.

## Planned capabilities

Not implemented yet:

- PR classification and automated labels
- risk classification
- CI summaries
- maintainer commands
- merge readiness checks

## Security

- GitHub App credentials, PEM files, and `.env` are not committed.
- Privileged operations (approval, merge, contents writes) are deny-by-default and are not implemented.
- Comment text is parsed as a command string only. It is never evaluated as code or passed to a shell.
- The GitHub App requests `issues: write`, `pull_requests: read`, and `metadata: read`. It does not request `contents: write`.

## License

Apache License 2.0. See [LICENSE](LICENSE).
