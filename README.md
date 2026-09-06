# DevOps Frontend

A React (Vite) app that acts as a "backend connection console" — it
calls the backend API and displays the response as a log. Built for a
DevOps course project: served as a static build via Nginx on an Ubuntu
VPS, and automatically deployed via GitHub Actions on every push to
`main`.

## Table of Contents

- [Purpose and Technologies](#purpose-and-technologies)
- [Architecture](#architecture)
- [Features](#features)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)
- [Production Build](#production-build)
- [Production Environment](#production-environment)
- [Deployment Process (CI/CD)](#deployment-process-cicd)
- [Troubleshooting](#troubleshooting)

## Purpose and Technologies

This frontend calls the backend's `/`, `/api/health`, and `/api/info`
endpoints and shows the response (status code, latency, JSON body) on
screen. The goal is to visually verify the frontend–backend connection
and demonstrate the "push code → auto-deploy" pipeline end to end for
this DevOps course.

| Component  | Technology            |
|------------|--------------------------|
| Framework  | React 19                 |
| Build tool | Vite                      |
| Server     | Nginx (static files)      |
| CI/CD      | GitHub Actions            |

## Architecture

```
Developer (local)
      │  git push (main)
      ▼
   GitHub
      │  GitHub Actions triggered
      ▼
GitHub Actions Runner
  1. checkout
  2. npm ci
  3. npm test
  4. npm run build  (VITE_API_URL is baked into the build)
  5. SCP the dist/ folder to the VPS
  6. SSH in: nginx -t + systemctl reload nginx
      │
      ▼
Ubuntu VPS (deploy user)
  /var/www/frontend-app  (static files: index.html, assets/)
      │
      ▼
   Nginx (static file serving + SPA fallback)
      │
      ▼
https://esra-frontend.team-vit-devops.nl
      │
      │  fetch() from the browser
      ▼
https://esra-backend.team-vit-devops.nl  (backend API)
```

The frontend bakes the backend's address (`VITE_API_URL`) into the code
at build time, so this variable must be set correctly whenever a
production build is created (see
[Environment Variables](#environment-variables)).

## Features

- **Home page** — a hero section explaining what the app does.
- **Backend connection console** — buttons to call `/`, `/api/health`,
  and `/api/info` individually; each request is logged with a
  timestamp, HTTP status code, latency (ms), and the JSON response.
- **Connection status indicator** — a dot in the header shows whether
  the last request succeeded (green) or failed (red).
- **Version / last-updated info** — the app version and build time are
  shown in the header and footer.

## Running Locally

Requirement: Node.js 20 LTS (via nvm: `nvm use 20`). The backend also
needs to be running locally on `http://127.0.0.1:3000` (see the
`devops-backend` repo).

```bash
git clone https://github.com/esrademirturk-nl/devops-frontend.git
cd devops-frontend
cp .env.example .env
# set VITE_API_URL in .env to http://127.0.0.1:3000
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

## Environment Variables

| Variable           | Description                                                     | Local value                | Production value |
|--------------------|----------------------------------------------------------------------|------------------------------|-----------------------|
| `VITE_API_URL`     | Backend's address; baked into the build at build time               | `http://127.0.0.1:3000`     | `https://esra-backend.team-vit-devops.nl` |
| `VITE_APP_VERSION` | Version shown in the header/footer                                    | `1.0.0`                      | `vars.APP_VERSION` (GitHub Actions) |

The `.env` file is never committed to the repository. When the
production build is created in GitHub Actions, `VITE_API_URL` is read
from `secrets.VITE_API_URL`.

## Production Build

```bash
npm run build
```

Output is written to `dist/`. Its contents (`index.html` and `assets/`)
are copied to `/var/www/frontend-app` on the server during deployment
and served statically by Nginx. Since this is a single-page app (SPA),
the Nginx config uses `try_files $uri $uri/ /index.html;` so page
refreshes don't return a 404.

## Production Environment

| Item            | Value                                            |
|------------------|------------------------------------------------------|
| Domain           | `https://esra-frontend.team-vit-devops.nl`           |
| File path        | `/var/www/frontend-app`                              |
| Server           | Nginx (static file serving)                          |
| Backend address  | `https://esra-backend.team-vit-devops.nl`            |

## Deployment Process (CI/CD)

Deployment is defined in `.github/workflows/deploy.yml` and triggers
automatically on every push to `main`:

1. Code is checked out.
2. Dependencies are installed with `npm ci`.
3. Tests run, if present.
4. A production build is created with `npm run build` (`VITE_API_URL`
   is read from a secret and baked into the code).
5. The contents of `dist/` are sent to the VPS's
   `/var/www/frontend-app` directory via `scp`, authenticated with an
   SSH key.
6. On the server, the Nginx configuration is validated with `nginx -t`.
7. If the test passes, Nginx is reloaded with `systemctl reload nginx`.

**Manually connecting to the server and running `git pull` is not an
accepted deployment method** — the entire process runs through GitHub
Actions.

### Required GitHub Actions Secrets / Variables

| Name              | Type     | Description                                          |
|-------------------|----------|-----------------------------------------------------------|
| `SERVER_HOST`     | Secret   | VPS IP address                                       |
| `SERVER_USER`     | Secret   | Restricted deployment user (`deploy`)                |
| `SERVER_SSH_KEY`  | Secret   | SSH private key (belonging only to the `deploy` user)|
| `SERVER_PORT`     | Secret   | SSH port (`22`)                                      |
| `DEPLOY_PATH`     | Secret   | `/var/www/frontend-app`                               |
| `VITE_API_URL`    | Secret   | `https://esra-backend.team-vit-devops.nl`             |
| `APP_VERSION`     | Variable | Version number to display (e.g. `1.0.0`)             |

A dedicated NOPASSWD sudo rule (`/etc/sudoers.d/deploy-nginx`) lets the
`deploy` user run only `nginx -t` and `systemctl reload nginx` without a
password — nothing else.

## Troubleshooting

| Symptom                                          | Likely cause / fix                                                     |
|-----------------------------------------------------|-----------------------------------------------------------------------|
| Page loads but can't reach the backend            | `VITE_API_URL` may have been built incorrectly → check the secret and redeploy |
| Page refresh returns 404                          | The `try_files` line may be missing/wrong in the Nginx config          |
| Pipeline fails at the "nginx -t" step              | There's an Nginx config syntax error, check details with `nginx -t` on the server |
| Domain doesn't load but the IP works               | DNS record isn't up to date, check with the DNS provider                |
