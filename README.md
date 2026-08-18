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
| Deploy | Podman Compose on a VM, built from source |

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
│   └── providers.js       GET/POST/PUT/DELETE /api/v2/providers
├── components/
│   ├── JsonSchemaForm.vue Recursive form generated from a JSON Schema
│   ├── SchemaBuilder.vue  Recursive visual editor *for* a JSON Schema
│   └── ConfirmModal.vue   Reusable confirm dialog
├── utils/
│   └── schema.js         JSON Schema ⇄ editable field tree conversion
├── views/
│   ├── PlacementsView.vue List, search, create, edit, delete placements
│   └── ProvidersView.vue  List, search, create, edit, delete providers
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
placement modal, `JsonSchemaForm` renders inputs for that schema — strings,
numbers, booleans, enums (as selects), arrays (as add/remove lists) and nested
objects (recursively). Changing the provider resets `provider_resources`, since
the schema changed.

### Visual provider schema builder

A provider's `rules` is stored as raw JSON, but hand-writing JSON Schema is a
poor editing experience, so `ProvidersView` edits it as a list of properties
instead. Each row is one property: **name**, **type** (string, integer, number,
boolean, object, array), a **Mandatory** checkbox that drives the schema's
`required` array, and — behind the chevron — a description and, for strings, a
comma-separated list of allowed values that becomes an `enum` (and therefore a
dropdown on the placement form). Object properties and arrays-of-objects nest
another builder inside themselves, to any depth.

`src/utils/schema.js` does the conversion both ways:

| Function | Direction |
|---|---|
| `schemaToFields(schema)` | JSON Schema → ordered field nodes |
| `fieldsToSchema(fields, extras)` | field nodes → JSON Schema |
| `validateFields(fields)` | blank / duplicate property names |
| `describeSchema(schema)` | `"3 properties · 1 required"` for the table |

Two details worth knowing:

- **Unknown keywords survive.** Anything the builder has no control for
  (`pattern`, `minimum`, `format`, `$comment`, root-level `title`…) is parked on
  the field's `extra` and merged back on save, so editing a provider never
  silently drops a constraint the UI doesn't render.
- **The JSON tab is the escape hatch.** The rules editor has a Builder/JSON
  toggle over the same schema; switching tabs converts, and whichever tab is
  active when you press Save is the one that defines the payload. Switching to
  the builder with invalid JSON is refused rather than losing your text.

Properties with a blank name are skipped when generating the schema, so a
half-typed row never reaches the backend.

### Placement search

The backend matches the `name` query param **exactly**, so the search box doesn't
use it. `PlacementsView.load()` fetches the full list once (`page_size: -1`) into
`allPlacements`, and the `filtered` computed does a case-insensitive "contains"
match on the name plus the `visible_on_ui` filter. Results update as you type —
no Search button — and paging slices `filtered` locally.

This means the view always fetches every placement. Fine at the current data
size; if the table grows large, add a partial-match param (e.g. `name_like`) to
the backend and move the filtering and paging back server-side.

## Deployment

The VM is behind the corporate VPN, so **GitHub can't reach in** — no SSH deploy
step, no webhook. Only outbound traffic works (`ghcr.io` and `github.com` are both
reachable from the VM), so deployment is **pull-based**:

```
push to main → Actions builds both images → GHCR (:test-latest, :prod-latest)
             → Watchtower on the VM polls every 120s → recreates the containers
```

The VM runs **Podman** (rootful) with compose. Three containers, from
`docker-compose.deploy.yml`:

| Service | Container | Host port | Path prefix | Env file |
|---|---|---|---|---|
| `test` | `simple-placement-providers-test-1` | 3001 | `/test` | `.env.test` |
| `prod` | `simple-placement-providers-prod-1` | 3002 | `/prod` | `.env.prod` |
| `watchtower` | `simple-placement-providers-watchtower-1` | — | — | — |

`VITE_BASE_PATH` is a build ARG, so **test and prod are different images** — the
prefix is compiled into the bundle. Everything else (API URL, Basic Auth
credentials, `VITE_ALLOWED_HOST`) is read at runtime from the env file, so the
images themselves contain no secrets.

`docker-compose.yml` still builds from source, for local runs. The VM uses
`docker-compose.deploy.yml`, which pulls from GHCR instead — don't run the deploy
file with `--build`.

### One-time VM setup

The GHCR package is **public**, so nothing needs to authenticate to pull it. The
images hold only the built frontend bundle — API URL and Basic Auth credentials come
from the env files at container start, so they aren't in the image.

```bash
# 1. Containers use restart: unless-stopped, which only survives a reboot if this
#    is enabled. podman.socket is what Watchtower talks to.
systemctl enable --now podman-restart.service podman.socket

# 2. Deploy.
mkdir -p /opt/simple-placement-providers
cd /opt/simple-placement-providers          # copy the compose + env files here
docker-compose -f docker-compose.deploy.yml up -d
```

If you ever make the package private, both the podman pull path and Watchtower need
a classic PAT scoped to `read:packages`:

```bash
# --authfile matters: podman's default root auth path is /run/containers/0/auth.json
# on tmpfs, so it would be lost on reboot.
podman login --authfile /root/.docker/config.json ghcr.io -u <github-user>

# Watchtower reads /config.json — give it its own file so it never sees the other
# registry logins in /root/.docker/config.json, then uncomment the mount in
# docker-compose.deploy.yml.
mkdir -p /etc/watchtower
printf '{"auths":{"ghcr.io":{"auth":"%s"}}}\n' \
  "$(printf '%s:%s' '<github-user>' '<PAT>' | base64 -w0)" > /etc/watchtower/config.json
chmod 600 /etc/watchtower/config.json
```

Keep the directory named `simple-placement-providers`. Compose derives the
project name from it, and that name is what ties the command to the existing
containers — rename the directory and you get a second, duplicate stack fighting
for ports 3001/3002.

> **Don't deploy from `/tmp`.** `systemd-tmpfiles` clears it periodically, which
> takes the compose file and both env files with it. This already happened once.
> Use `/opt` or `/srv`.

Watchtower needs `/run/podman/podman.sock` (podman's Docker-compatible API,
provided by `podman.socket`) and runs label-enabled: it only updates containers
carrying `com.centurylinklabs.watchtower.enable=true`, so other stacks on the VM
are left alone. `WATCHTOWER_CLEANUP=true` deletes each superseded image, which
matters — the VM's root filesystem is small, and `podman image prune` is worth
running if it fills up.

### Env files on the VM

`.env.test` and `.env.prod` sit next to the compose file and are gitignored. Each
needs:

```
VITE_API_BASE_URL=https://<gateway-host>/<api-path>
VITE_BACKEND_USER=<user>
VITE_BACKEND_PASSWORD=<password>
VITE_ALLOWED_HOST=<public hostname of this VM>
```

`VITE_ALLOWED_HOST` matters: the containers serve via `vite preview`, which
rejects requests whose `Host` header it doesn't recognise when behind a proxy.

If you ever lose these, `podman inspect <container> --format '{{json .Config.Env}}'`
shows the live values of a running container.

### Reverse proxy

`nginx-vm.conf` is a sample config for the host fronting both containers — set
`server_name`, then drop it in `/etc/nginx/conf.d/`. `nginx.conf` is the in-image
config for a static nginx variant, if you'd rather not serve via `vite preview`.

### Updating a deployment

Push to `main` — that's it. Both environments track `main`, so a merge updates
`/prod` too. To watch it land:

```bash
podman logs -f simple-placement-providers-watchtower-1
podman inspect simple-placement-providers-test-1 --format '{{.ImageName}} {{.Created}}'
```

To force it immediately instead of waiting out the poll interval, or after
changing only `.env.test` / `.env.prod` (read at container start, not baked into
the image):

```bash
cd /opt/simple-placement-providers
docker-compose -f docker-compose.deploy.yml up -d
```

To roll back, deploy the immutable tag the workflow also pushed —
`ghcr.io/<owner>/simple-placement-providers:prod-<sha>` — or revert the commit.

## CI

`.github/workflows/deploy.yml` builds both images on a GitHub-hosted runner on
every push to `main` (and via **workflow_dispatch**) and pushes them to GHCR as
`<env>-latest` plus an immutable `<env>-<sha>`. `GITHUB_TOKEN` authenticates the
push, so no secrets need configuring on the GitHub side.

The workflow never touches the VM — nothing can reach it inbound through the VPN.
Handoff is the `<env>-latest` tag: the workflow moves it, Watchtower notices.

## Notes and limitations

- No test suite yet.
- Placement page size is fixed at 20 (`pageSize` in `PlacementsView.vue`).
- The provider list isn't paginated — it fetches everything and filters on the
  client, same as placements.
- Provider create/update/delete assume the backend exposes `POST`, `PUT` and
  `DELETE` on `/api/v2/providers`, mirroring the placements endpoints.
