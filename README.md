# Placements & Providers

A small Vue 3 admin UI for managing **placements** and viewing the **providers**
they belong to. Placements are created against a provider, and each provider
ships a JSON Schema (its `rules`) that describes the resource fields a placement
must supply — the form for those fields is generated from that schema at runtime.

The app is frontend-only. It talks to an existing backend API (`/api/v2/...`)
through a proxy that injects Basic Auth server-side, so no credentials are ever
baked into the browser bundle.

## Stack

| | |
|---|---|
| Framework | Vue 3 (`<script setup>` SFCs) |
| Routing | vue-router, hash history |
| HTTP | axios |
| Styling | Tailwind CSS |
| Build | Vite 5 |
| Deploy | Docker + nginx |

## Getting started

```bash
npm install
cp .env.example .env      # then fill in the values below
npm run dev               # http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | yes | Full backend URL including any path prefix, e.g. `https://api-gateway-test.internal.example.com/placement-api`. Vite splits this into a proxy origin + path prefix. |
| `VITE_BACKEND_USER` | no | Basic Auth username. |
| `VITE_BACKEND_PASSWORD` | no | Basic Auth password. Both are combined into an `Authorization` header by the dev/preview proxy — set them only if the backend requires auth. |
| `VITE_ALLOWED_HOST` | no | Hostname the preview server may be served under. Needed when running behind a reverse proxy; leave unset for localhost. |
| `VITE_BASE_PATH` | no | Build-time path prefix (e.g. `/test`) when the app is served from a sub-path. Baked into the bundle by `docker-compose`. |

Env files are gitignored — `.env.example` is the only one committed. Never put
real credentials in a committed file.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 3000, with API proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built bundle on port 4173 |

## Project layout

```
src/
├── api/
│   ├── index.js          axios instance, response unwrapping, error normalization
│   ├── placements.js      GET/POST/PUT/DELETE /api/v2/placements
│   └── providers.js       GET /api/v2/providers
├── components/
│   ├── JsonSchemaForm.vue Recursive form generated from a JSON Schema
│   └── ConfirmModal.vue   Reusable confirm dialog
├── views/
│   ├── PlacementsView.vue List, search, create, edit, delete placements
│   └── ProvidersView.vue  Read-only provider list + rules viewer
├── App.vue               Sidebar shell + nav
└── main.js               App bootstrap and routes
```

## How it works

### API layer

`src/api/index.js` creates one axios instance with `baseURL` set from
`VITE_BASE_PATH`, so requests go to `/<prefix>/api/v2/...` and the proxy (Vite in
dev, nginx in Docker) forwards them to the real backend. A response interceptor
unwraps `res.data` and normalizes errors into `Error(message)`, so views can just
`catch (e) { error.value = e.message }`.

List endpoints return `{ items, total }`. Passing `page_size: -1` returns
everything unpaginated.

### Schema-driven placement form

Each provider carries a `rules` JSON Schema. When you pick a provider in the
placement modal, `JsonSchemaForm` renders inputs for that schema —
strings, numbers, booleans, enums (as selects), and nested objects (recursively).
Changing the provider resets `provider_resources`, since the schema changed.

### Placement search

The backend matches the `name` query param **exactly**. To make the search box
behave like a "contains" filter, `PlacementsView.load()` omits `name` when a
search term is present, requests the full list (`page_size: -1`), and filters
case-insensitively client-side, paginating the matches locally. With an empty
search box it falls back to normal server-side pagination.

This means a search fetches every placement. Fine at the current data size; if
the table grows large, add a partial-match param (e.g. `name_like`) to the
backend and move the filtering back server-side.

## Docker

Two environments run side by side, each with its own path prefix and env file:

| Service | Host port | Path prefix | Env file | Image tag |
|---|---|---|---|---|
| `test` | 3001 | `/test` | `.env.test` | `:test-latest` |
| `prod` | 3002 | `/prod` | `.env.prod` | `:prod-latest` |

`VITE_BASE_PATH` is a build ARG, so **test and prod are different images** — the
prefix is compiled into the bundle. Everything else (API URL, credentials) is
read at runtime by the preview proxy, so images contain no secrets.

To build and run locally:

```bash
docker compose up -d --build          # docker-compose.yml — builds from source
```

`nginx-vm.conf` is a sample reverse-proxy config for a VM fronting both
containers — set `server_name` to your hostname and drop it in
`/etc/nginx/conf.d/`. `nginx.conf` is the in-image config for a static nginx
variant, if you'd rather not serve via `vite preview`.

Because the containers run `vite preview`, `VITE_ALLOWED_HOST` must be set to
the public hostname in each env file, or the preview server rejects the
proxied requests.

## CI/CD

`.github/workflows/deploy.yml` runs on every push to `main` (and via
**workflow_dispatch**):

1. **build** — a 2-job matrix builds the `test` and `prod` images with the right
   `VITE_BASE_PATH` and pushes each to GHCR as `<env>-latest` plus an immutable
   `<env>-<sha>`. Layer caching is scoped per environment.
2. **deploy** — SSHes into the VM via `appleboy/ssh-action` and runs
   `docker compose pull && docker compose up -d` against
   `docker-compose.deploy.yml`.

The deploy job targets a `production` GitHub environment, so you can require a
manual approval in repo settings; remove the `environment:` line to deploy
unattended.

### Required secrets and variables

Repo → Settings → Secrets and variables → Actions.

| Name | Kind | Description |
|---|---|---|
| `SSH_HOST` | secret | VM hostname or IP |
| `SSH_USER` | secret | SSH user, must be in the `docker` group |
| `SSH_KEY` | secret | Private key (full PEM, including header/footer) |
| `SSH_PORT` | secret | Optional, defaults to 22 |
| `GHCR_PULL_TOKEN` | secret | PAT with `read:packages`, for the VM's `docker login`. Not needed if you make the GHCR package public |
| `DEPLOY_PATH` | variable | Directory on the VM holding the compose and env files, e.g. `/opt/placements` |

`GITHUB_TOKEN` handles the push side automatically — no secret needed for that.

### One-time VM setup

The VM needs Docker with the Compose plugin, and this in `$DEPLOY_PATH`:

```
docker-compose.deploy.yml     # copied from this repo
.env.test                     # real values — never committed
.env.prod                     # real values — never committed
```

`docker-compose.deploy.yml` has no `build:` section; it only pulls. Keep it in
sync by hand when it changes, or add an `appleboy/scp-action` step to the
workflow to copy it up on each deploy.

### Rollback

Images are tagged with the commit SHA, so pin and redeploy:

```bash
cd $DEPLOY_PATH
IMAGE_REPO=ghcr.io/<owner>/<repo> IMAGE_TAG=<good-sha> \
  docker compose -f docker-compose.deploy.yml up -d
```

## Notes and limitations

- Providers are read-only in this UI; they're managed elsewhere.
- No test suite yet.
- Placement page size is fixed at 20 (`pageSize` in `PlacementsView.vue`).
