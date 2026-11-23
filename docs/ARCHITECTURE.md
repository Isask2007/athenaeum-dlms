# DLMS — Architecture & Folder Structure

## Overview

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 (mobile-first, dark mode) |
| Backend | Node.js + Express 4 REST API (JSON) |
| Database | MySQL 8 in production; SQLite (`node:sqlite`) zero-config dev driver |
| Auth | JWT (HS256) + bcrypt password hashing, RBAC: `admin`, `librarian`, `member` |
| Files | Multer uploads → `server/storage/` (covers, PDF/EPUB) |
| Charts | Dependency-free inline SVG components |

The data layer (`server/db/index.js`) exposes a tiny query interface (`all`, `get`, `run`) used
by every route. It picks a driver from `DB_DRIVER` (`sqlite` by default, `mysql` for production),
so no route contains driver-specific SQL.

## Folder structure

```
DLMS/
├── docs/
│   ├── ARCHITECTURE.md          # this file
│   └── DATABASE.md              # tables, relations, indexes, schema decisions
├── public/
│   ├── covers/                  # generated SVG covers (18 seeded resources)
│   └── digital/                 # seeded sample PDFs for the reader
├── scripts/
│   ├── generate-assets.mjs      # creates cover SVGs + sample PDFs
│   └── seed-check.mjs           # smoke test for seeded data
├── server/
│   ├── index.js                 # HTTP bootstrap (port, graceful shutdown)
│   ├── app.js                   # middleware + route mounting + error handler
│   ├── config.js                # env parsing and constants
│   ├── db/
│   │   ├── index.js             # driver factory, query helpers, transaction helper
│   │   ├── schema.sqlite.sql
│   │   ├── schema.mysql.sql
│   │   ├── seed-data.js         # 18 resources, demo accounts, loans, fines
│   │   └── seed.js              # idempotent seeding
│   ├── middleware/
│   │   ├── auth.js              # JWT verification, requireAuth, requireRole
│   │   ├── validate.js          # request validation helpers
│   │   └── error.js             # AppError, 404, central error responder
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── catalog.routes.js
│   │   ├── circulation.routes.js
│   │   ├── member.routes.js
│   │   ├── admin.routes.js
│   │   └── analytics.routes.js
│   ├── services/
│   │   ├── loans.js             # issue / return / renew / overdue fines / waivers
│   │   ├── citations.js         # APA / MLA / IEEE generators
│   │   ├── analytics.js         # dashboard aggregations
│   │   └── audit.js             # immutable action log
│   ├── utils/
│   │   └── dates.js
│   └── storage/                 # runtime uploads (git-ignored)
└── src/
    ├── main.jsx
    ├── App.jsx                  # router + providers + route guards
    ├── index.css                # Tailwind import + design tokens
    ├── lib/
    │   ├── api.js               # fetch wrapper, token injection, error mapping
    │   ├── auth.jsx             # auth context, demo-account quick login
    │   ├── theme.jsx            # light/dark/system theme
    │   ├── toast.jsx            # toast provider
    │   ├── format.js            # dates, numbers, format labels
    │   └── citations.js         # client-side citation preview helpers
    ├── components/
    │   ├── layout/              # AppShell, Topbar, Sidebar, MobileNav, Footer
    │   ├── ui/                  # Button, Badge, Card, Input, Select, Modal, Tabs,
    │   │                        # Skeleton, EmptyState, StatCard, ProgressBar
    │   ├── catalog/             # SearchBar, FilterPanel, ResourceCard, ResourceList,
    │   │                        # FormatBadge, AvailabilityBadge, ActiveFilters
    │   ├── reader/              # DigitalReader (PDF canvas + paginated text),
    │   │                        # CitationDialog, ReaderToolbar
    │   └── charts/              # BarChart, DonutChart, Sparkline (inline SVG)
    └── pages/
        ├── HomePage.jsx         # landing + hero instant search + featured shelves
        ├── CatalogPage.jsx      # OPAC: filters, sort, grid/list toggle, pagination
        ├── ItemDetailPage.jsx   # full metadata, actions, related items
        ├── ReaderPage.jsx       # in-browser reader + citation generator
        ├── LoginPage.jsx
        ├── DashboardPage.jsx    # member overview + tabs
        ├── RequestsPage.jsx     # request-a-resource history (member tab)
        ├── admin/
        │   ├── AdminPage.jsx    # nested admin navigation + header
        │   ├── AnalyticsPage.jsx
        │   ├── CatalogManagementPage.jsx
        │   ├── CirculationPage.jsx
        │   ├── UsersPage.jsx
        │   └── AuditLogPage.jsx
        └── NotFoundPage.jsx
```

## Request flow

```
Browser (React SPA)
  → src/lib/api.js attaches Bearer JWT
  → Express /api routes
  → requireAuth / requireRole middleware
  → service layer (business rules: fines, availability, permissions)
  → db query interface
  → SQLite (dev) or MySQL (prod)
  → JSON response
  → toast + optimistic UI refresh
```

## RBAC matrix

| Capability | Member | Librarian | Admin |
| --- | --- | --- | --- |
| Public catalog / reader access | ✅ | ✅ | ✅ |
| Borrow / reserve / bookmark / request | ✅ | ✅ | ✅ |
| Member dashboard | ✅ | ✅ | ✅ |
| Catalog management (CRUD + uploads) | — | ✅ | ✅ |
| Circulation desk (issue/return/approve/fines) | — | ✅ | ✅ |
| Analytics overview | — | ✅ | ✅ |
| User management + audit logs | — | — | ✅ |

## UX conventions

- Calm academic palette: warm `#faf9f6` surfaces, deep navy `#12213a` primary, emerald/amber status.
- Mobile-first: filters become a bottom sheet, tables become cards, sidebar becomes a drawer.
- Skeleton loaders on catalog/dashboard/admin data fetches; toast notifications for every mutation.
- Dark mode via `class` strategy on `<html>`, persisted in `localStorage`, respects OS preference.
