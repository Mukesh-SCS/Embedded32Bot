# Embedded32Bot

GitHub App that automates maintenance for [Embedded32](https://github.com/Mukesh-SCS/Embedded32).

The bot classifies pull requests, updates a single status comment, and exposes maintainer commands. Privileged actions are deny-by-default until GitHub repository permissions allow them.

## Architecture

```text
GitHub webhook
      │
      ▼
handlers/          receive events
      │
      ▼
commands/ policy/  parse commands and make decisions
      │
      ▼
github/            thin Octokit wrappers
      │
      ▼
GitHub API
```

Automatic PR refresh lives in `src/services/pr-analysis.ts`. Command handlers call the same refresh path so labels and the status comment stay consistent.

## Current capabilities

Automatic, on `Mukesh-SCS/Embedded32` pull requests:

- classify areas, risk, and conservative type/release labels
- update bot-managed labels without removing unrelated human labels
- keep one persistent status comment (`<!-- embedded32bot:status -->`)
- recompute status when checks or reviews change

Commands:

| Command | Who |
| --- | --- |
| `@embedded32bot help` | anyone |
| `@embedded32bot status` | anyone |
| `@embedded32bot recheck` | PR author or write+ |
| `@embedded32bot label <label>` | write, maintain, or admin |
| `@embedded32bot rerun-ci` | write, maintain, or admin |
| `@embedded32bot merge` | maintain or admin |
| `@embedded32bot revert` | maintain or admin |

Authorization uses GitHub's collaborator permission API, not comment text or `author_association`.

## Requirements

- Node.js 20.18–22.x (CI uses 20.18.0 and 22.23.2; production is pinned to 22.23.2 via `.node-version` and `render.yaml`)
- npm
- GitHub App credentials

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
2. Set `APP_ID`, `PRIVATE_KEY` or `PRIVATE_KEY_PATH`, and `WEBHOOK_SECRET`.
3. For local webhook delivery, start a [smee.io](https://smee.io) channel and set `WEBHOOK_PROXY_URL`.
4. Build and start:

```bash
npm run build
npm start
```

`npm run dev` builds and then starts. After code changes, rebuild before restarting.

Install the GitHub App on `Mukesh-SCS/Embedded32` only.

## Render deployment

Production flow:

```text
GitHub → Render HTTPS webhook → Embedded32Bot → GitHub API
```

Do not set `WEBHOOK_PROXY_URL` in production. Smee is development-only.

Build command:

```bash
npm ci --include=dev && npm run build
```

Start command:

```bash
npm start
```

Required Render secrets:

- `APP_ID`
- `PRIVATE_KEY`
- `WEBHOOK_SECRET`

Also set `HOST=0.0.0.0`. Render provides `PORT`.

Health check: `GET /health`

Production webhook path:

```text
https://<render-host>/api/github/webhooks
```

If the service name is `embedded32bot`, that is typically:

```text
https://embedded32bot.onrender.com/api/github/webhooks
```

Render starter/free instances can sleep after inactivity. A sleeping bot will miss GitHub webhooks until it wakes. Use an always-on instance for a maintainer bot that must react immediately.

See `render.yaml`.

## Merge policy

`@embedded32bot merge` is a merge request, not an override. It refuses to merge when the PR is draft, not targeting `main`, conflicted, missing required CI, missing a human approval, blocked, or stale relative to the approved head SHA. The bot does not bypass branch protection and does not submit GitHub review approvals.

High-risk and critical PRs still require an explicit maintainer `merge` command. There is no silent auto-merge.

After a successful merge, GitHub emits `pull_request.closed`. That event refreshes labels and the status comment so `status: ready-to-merge` is removed.

## Revert policy

`@embedded32bot revert` works only on merged PRs. It opens a revert PR through GitHub rather than rewriting `main`. The revert PR must pass CI and the normal merge policy. Duplicate revert requests return the existing revert PR.

## GitHub App permissions

Declared in `app.yml`. Changing that file does not update an already-registered GitHub App.

| Permission | Level | Why |
| --- | --- | --- |
| Metadata | Read | repository identity |
| Issues | Write | command replies and status comments |
| Pull requests | Write | labels, merge, revert PR |
| Checks | Read | CI status |
| Actions | Write | rerun failed jobs |
| Contents | Write | revert branch/commit via GitHub |

Events: `issue_comment`, `pull_request`, `pull_request_review`, `check_run`, `check_suite`.

## Security

- Credentials, PEM files, and `.env` are not committed.
- Comment text is parsed as a command string only. It is never evaluated or passed to a shell.
- The bot does not execute contributor-controlled repository code.
- Merge and revert require maintain/admin permission on the target repository.

## License

Apache License 2.0. See [LICENSE](LICENSE).
