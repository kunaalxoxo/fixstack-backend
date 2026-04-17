# FixStack (DepShield)

Autonomous dependency security audit & patch agent for GitHub repos.

## Architecture

```
GitHub Webhook
      │
      ▼
 WorkflowOrchestrator
      │
      ├── ScannerAgent        — parses package.json / requirements.txt / go.mod / pom.xml
      ├── LookupAgent         — queries OSV.dev API + NVD REST API v2
      ├── ContextAnalystAgent — fetches repo source files, asks Groq LLM for exploitability
      ├── PlannerAgent        — asks Groq LLM for safest semver patch (with static fallback)
      ├── Validator           — simulates CI test run, drives self-correction retry loop
      └── GitHubPRService     — creates branch + commits updated manifest + opens PR
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub PAT with `repo` scope — for PR creation and code search |
| `GROQ_API_KEY` | Recommended | Groq API key for context-aware exploitability analysis and LLM patch planning |
| `GROQ_MODEL` | Optional | Preferred Groq model for chat completions (e.g. `llama-3.3-70b-versatile`) |
| `GROQ_MODELS` | Optional | Comma-separated fallback models to try if the preferred model is unavailable |
| `GITHUB_WEBHOOK_SECRET` | Recommended | Shared secret for HMAC-SHA256 webhook signature verification |
| `NVD_API_KEY` | Optional | NVD API key (increases rate limit from 5/30s to 50/30s) |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/run-scan` | Manually trigger a scan. Body: `{ repoUrl }` or `{ input }` |
| `POST` | `/api/webhook` | GitHub App webhook receiver (push + pull_request events) |
| `GET` | `/api/runs` | List all scan runs |
| `GET` | `/api/runs/:id` | Get a specific run with full results |
| `GET` | `/api/runs/:id/events` | Get the live agent reasoning trace for a run |
| `POST` | `/api/run-org-scan` | Scan all public repos in an org. Body: `{ org }` |
| `POST` | `/api/schedules` | Schedule a recurring scan. Body: `{ repoUrl, cronExpression }` |
| `GET` | `/api/schedules` | List all scheduled scans |
| `DELETE` | `/api/schedules/:repoUrl` | Delete a scheduled scan |
| `POST` | `/api/settings` | Save webhook URL and email for alerts |

## Webhook Setup

1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Set Payload URL to `https://your-backend/api/webhook`
3. Content type: `application/json`
4. Secret: same value as `GITHUB_WEBHOOK_SECRET`
5. Events: **Push** + **Pull requests**

## Quick Start

```bash
npm install
GITHUB_TOKEN=ghp_xxx GROQ_API_KEY=gsk_xxx npm run dev
```

## What Makes It Different from Dependabot / Snyk

- **Context-aware exploitability** — Groq LLM reads your actual source files before raising an alert. If the vulnerable API is never called, the CVE is deprioritized.
- **Dual CVE sources** — OSV.dev + NVD REST API v2 for maximum coverage.
- **Self-correcting patch loop** — If the first patch breaks CI, the agent retries with the next semver-safe version automatically. The retry trace is visible in the dashboard.
- **Agentic PR creation** — Not just a PR title, but a structured security advisory comment with CVE details, affected files, and fix rationale.
