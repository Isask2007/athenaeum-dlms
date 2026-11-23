# Athenaeum — Digital Library Management System

A complete, responsive library platform: public OPAC catalog, role-based member dashboard, digital reader with PDF rendering and citations, and a librarian/admin staff console. It runs immediately with zero configuration using an embedded SQLite database and generated demo assets.

## Quick start

Requires **Node.js 22.5+** (for the built-in `node:sqlite` driver).

```bash
npm install
npm run assets     # generate 18 book covers and 3 sample PDFs
npm run seed       # seed demo users, resources and circulation data (idempotent)
npm run build      # build the React client into dist/
npm start          # API + built client at http://localhost:4000
```

Open **http://localhost:4000**. During development, run `npm run dev` for the API on `:4000` and the Vite dev server on `:5173` (with an `/api` proxy).

Optional commands:

```bash
npm run check      # verify seeded data and generated assets
npm run dev:server # API only, with auto-reload
npm run dev:web    # Vite only
```

The server auto-seeds the database on first run and auto-generates nothing at runtime — run `npm run assets` once after cloning. The SPA is served by Express with a fallback to `index.html`, so deep links like `/item/2` and `/reader/2` work on refresh.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@athenaeum.edu` | `Admin@1234` |
| Librarian | `librarian@athenaeum.edu` | `Librarian@1234` |
| Member | `member@athenaeum.edu` | `Member@1234` |

The login page has one-click buttons for all three. Other seeded members use `Member@1234`. Seeded accounts include pending and suspended users so the admin approval/suspension flows can be exercised.

## What's included

- **Public OPAC** — instant search across title, author, ISBN/ISSN, subject and tags; filters for format, category/department, language, year and availability; grid/list views; availability badges; bookmark, borrow and reserve quick actions.
- **Item detail** — abstract, publisher, edition, ISBN/ISSN, shelf location, license information, tags, related resources and one-click APA/MLA/IEEE citations.
- **Digital reader** — in-browser PDF.js rendering with zoom, page jump, keyboard arrows, page bookmarks, text-edition fallback and citation generator.
- **Member dashboard** — overview cards (active borrows, due soon, reservations, pending fines), loans/digital shelf, saved items, reservations and purchase requests. Renew loans and pay fines online.
- **Staff console** — analytics charts (fine collection, loan volume, subject breakdown, most borrowed/viewed), catalog CRUD with cover/PDF/EPUB uploads, circulation desk (issue, return, renew, extend, waive, approve/fulfill/cancel reservations), purchase requests, user management and an audit log.
- **Access control** — JWT auth with `admin`, `librarian` and `member` roles; staff-only and admin-only routes enforced on both client and server. The sign-up form includes an **Account type** selector so visitors can create any of the three roles directly (defaults to `member`).
- **Design** — warm paper / deep navy academic palette, dark mode with persistence, skeleton loaders, toast notifications, responsive mobile layouts.

## Configuration

Copy `.env.example` to `.env` and adjust as needed. Defaults work out of the box.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API / built-app port |
| `JWT_SECRET` | see example | Token signing key — **change in production** |
| `JWT_EXPIRES` | `7d` | Token lifetime |
| `DB_DRIVER` | `sqlite` | `sqlite` or `mysql` |
| `SQLITE_FILE` | `server/data/dlms.sqlite` | SQLite database path |
| `MYSQL_HOST` / `MYSQL_PORT` | `127.0.0.1` / `3306` | MySQL host |
| `MYSQL_USER` / `MYSQL_PASSWORD` | `root` / empty | MySQL credentials |
| `MYSQL_DATABASE` | `dlms` | MySQL schema name |
| `MAX_UPLOAD_MB` | `20` | Upload size limit |

### Using MySQL

```bash
# 1. Create an empty schema
mysql -u root -p -e "CREATE DATABASE dlms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Configure .env
DB_DRIVER=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=dlms

# 3. Seed and start (tables are created automatically)
npm run seed
npm start
```

The canonical schema is in `server/db/schema.mysql.sql`; the SQLite equivalent is `server/db/schema.sqlite.sql`. All queries go through a shared `all/get/run/transaction` interface in `server/db/index.js`, so routes are database-agnostic. Timestamps are generated in JavaScript to keep both drivers compatible.

## REST API

All endpoints are prefixed with `/api`. Authenticated requests use `Authorization: Bearer <token>`.

### Auth — `/api/auth`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | public | Create an account; optional `role` = `member` / `librarian` / `admin` (default `member`) |
| POST | `/login` | public | Sign in, returns `{ user, token }` |
| GET | `/me` | auth | Current user |
| POST | `/logout` | public | Stateless logout acknowledgement |

### Catalog — `/api/catalog`
| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | public | Search, filter, sort, paginate (`search`, `format`, `category`, `language`, `year`, `availability`, `sort`, `page`, `limit` ≤ 60) |
| GET | `/facets` | public | Available filter values with counts |
| GET | `/:id` | public | Item detail plus related resources |
| GET | `/:id/citation?style=apa\|mla\|ieee` | public | Generated citation |
| POST | `/` | staff | Add resource (multipart: metadata + `cover`, `file`) |
| PUT | `/:id` | staff | Update resource |
| DELETE | `/:id` | staff | Delete resource (blocked if active loans) |

### Member — `/api/member`
| Method | Path | Description |
| --- | --- | --- |
| GET | `/overview` | Dashboard stats and digital shelf |
| GET | `/loans` | My loans |
| POST | `/loans` | Borrow `{ resource_id }` |
| POST | `/loans/:id/renew` | Renew (max 2, blocked if reserved) |
| POST | `/loans/:id/pay` | Pay fine |
| GET | `/bookmarks` | Saved resources |
| POST | `/bookmarks/:resourceId` | Toggle bookmark |
| GET | `/reservations` | My reservations |
| POST | `/reservations` | Reserve `{ resource_id }` |
| DELETE | `/reservations/:id` | Cancel reservation |
| GET | `/requests` | My purchase requests |
| POST | `/requests` | Submit request |
| GET | `/digital-shelf` | Digital loans |

### Circulation — `/api/circulation` (staff)
| Method | Path | Description |
| --- | --- | --- |
| GET | `/members` | Active members for loan issuance |
| GET | `/loans` | All loans |
| POST | `/loans` | Issue `{ user_id, resource_id, days }` |
| POST | `/loans/:id/return` | Return an item |
| POST | `/loans/:id/renew` / `/extend` | Renew / extend 7 days |
| POST | `/loans/:id/waive` | Waive fine |
| GET | `/reservations` | All reservations |
| POST | `/reservations/:id/approve` / `/fulfill` / `/cancel` | Reservation lifecycle |
| GET | `/fines` | Fine ledger |

### Admin — `/api/admin` (admin only)
| Method | Path | Description |
| --- | --- | --- |
| GET / POST | `/users` | List / create users |
| PATCH | `/users/:id` | Change role or status |
| GET | `/audit-logs` | Audit trail |
| GET / PATCH | `/requests`, `/requests/:id` | Review purchase requests |
| GET | `/summary` | Aggregate summary |

### Analytics — `/api/analytics`
`GET /overview`, `/popular`, `/viewed`, `/categories`, `/fine-collection`, `/loan-volume`.

### Health
`GET /api/health` → `{ ok: true, service: 'dlms-api', time }`.

## Project structure

```
src/                     React 19 + Vite 6 + Tailwind 4 client
  components/            ui, layout, catalog, reader, charts
  lib/                   api client, auth, theme, toast, formatting
  pages/                 public pages, dashboard, admin/*
server/
  db/                    drivers, schemas, seed data and seeder
  middleware/            auth, validation, upload, errors
  routes/                auth, catalog, member, circulation, admin, analytics
  services/              loans, citations, analytics, audit
  app.js / index.js      Express app and bootstrap
public/covers/           generated SVG covers
public/digital/          generated sample PDFs
scripts/                 asset generator and seed checker
docs/                    ARCHITECTURE.md, DATABASE.md
```

See `docs/ARCHITECTURE.md` for the folder plan and RBAC matrix, and `docs/DATABASE.md` for the full schema and business rules (14-day loans, max 2 renewals, `$1.50`/day fines, reservation-aware renewal).

## Deploy publicly (Render + GitHub)

The repo includes a `render.yaml` blueprint, so deployment takes a few clicks:

1. Create a **public GitHub repository** and push this folder to its `main` branch.
2. Go to [Render Blueprints](https://dashboard.render.com/blueprints) → **New Blueprint Instance** → connect GitHub and select the repo.
3. Render reads `render.yaml`, runs `npm install --include=dev && npm run assets && npm run build`, and starts with `npm start`.
4. Your public URL will be `https://athenaeum-dlms.onrender.com` (shown in the Render dashboard).

`JWT_SECRET` is generated automatically by Render. The database auto-seeds itself on first boot, so demo accounts work immediately. The free plan sleeps after inactivity; `.github/workflows/keepalive.yml` pings the health endpoint every 10 minutes to keep the app warm (you can also trigger it manually from the Actions tab). Uploaded files live on the instance's local disk and reset on redeploy — fine for the demo seed data, but use MySQL plus a persistent disk for long-term uploads.

## Notes

- **Security:** open registration intentionally allows visitors to choose `librarian` or `admin` for demo convenience. Before using this with real data, remove those options (or gate them with an invite code) in `src/pages/LoginPage.jsx` and restrict the `role` values accepted by `POST /api/auth/register`.
- Uploaded covers and PDFs/EPUBs are written to `server/storage/` and served under `/storage/`.
- Seeded digital files live in `public/digital/` and are served at `/digital/`.
- If the database or assets are missing, run `npm run assets && npm run seed` — both are safe to re-run.
- The built-in reader falls back to a paginated text edition when a PDF cannot be rendered.
