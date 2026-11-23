# DLMS — Database Schema

Canonical DDL: `server/db/schema.mysql.sql` (MySQL 8). The development driver runs the
semantically identical `server/db/schema.sqlite.sql` with `node:sqlite`. Both are created and
seeded automatically on first start.

## Entity relationship

```
users ─┬─< loans ──────────> resources
       ├─< reservations ───> resources
       ├─< bookmarks ──────> resources
       ├─< resource_requests
       ├─< fine_payments ───> loans
       └─< audit_logs (actor)

resources ──< loans, reservations, bookmarks
```

## Tables

### `users`
| Column | Type | Notes |
| --- | --- | --- |
| id | BIGINT PK AUTO_INCREMENT | |
| name | VARCHAR(120) | full name |
| email | VARCHAR(190) UNIQUE | login identifier |
| password_hash | VARCHAR(255) | bcrypt cost 10 |
| role | ENUM('admin','librarian','member') | RBAC |
| status | ENUM('pending','active','suspended') | admin approval workflow |
| department | VARCHAR(120) | faculty / student department |
| member_id | VARCHAR(40) UNIQUE | e.g. `STU-2024-001` |
| created_at | DATETIME | UTC |

### `resources`
| Column | Type | Notes |
| --- | --- | --- |
| id | BIGINT PK | |
| title, subtitle | VARCHAR | searchable |
| authors | JSON | array of author names |
| isbn, issn | VARCHAR | identifiers |
| publisher | VARCHAR | |
| publication_year | SMALLINT | filter |
| edition | VARCHAR | |
| language | VARCHAR(40) | filter |
| format | ENUM('physical','ebook','research_paper','audio_video') | filter |
| category | VARCHAR(80) | filter (e.g. Computer Science) |
| department | VARCHAR(120) | filter |
| description, abstract | TEXT | displayed on detail page |
| shelf_location | VARCHAR(40) | physical only |
| total_copies, available_copies | INT | availability (physical) |
| file_url, file_type | VARCHAR | digital asset path |
| license_info | VARCHAR(255) | digital license / access terms |
| page_count | INT | reader |
| pages_json | JSON | paginated text for built-in reader |
| cover_url | VARCHAR | SVG cover |
| tags | JSON | searchable tags |
| views, borrows | INT | popularity analytics |
| created_at, updated_at | DATETIME | |

### `loans`
`id, user_id FK, resource_id FK, issued_at, due_at, returned_at NULL, renewed_count,
status ENUM('active','returned','overdue','lost'), fine_amount DECIMAL(8,2),
fine_waived DECIMAL(8,2), digital_expires_at NULL` — one row per checkout; fines are computed
on return and can be waived by librarian/admin.

### `reservations`
`id, user_id FK, resource_id FK, reserved_at, status ENUM('pending','approved','fulfilled','cancelled'),
approved_by FK NULL, approved_at NULL, expires_at NULL`

### `bookmarks`
`id, user_id FK, resource_id FK, created_at, UNIQUE(user_id, resource_id)`

### `resource_requests`
`id, user_id FK, title, author, note, status ENUM('pending','approved','declined'), created_at`

### `fine_payments`
`id, user_id FK, loan_id FK NULL, amount DECIMAL(8,2), paid_at, method`

### `audit_logs`
`id, actor_id FK NULL, action VARCHAR(80), target_type VARCHAR(40), target_id BIGINT NULL,
detail JSON, created_at` — appended by `services/audit.js` for user/role/circulation changes.

## Indexes

- `users(email)`, `users(role, status)`
- `resources(format, category, language, publication_year)`
- `loans(user_id, status)`, `loans(resource_id, status)`, `loans(due_at)`
- `reservations(user_id, status)`, `bookmarks(user_id)`
- `audit_logs(created_at)`

## Business rules

1. Only physical resources can be borrowed; digital formats are read online with a timed license
   (`digital_expires_at` on loans).
2. Issuing a physical loan decrements `available_copies`; returning increments it.
3. Reservations are queued (`pending` → `approved` → `fulfilled`) by librarian/admin.
4. Overdue fine = `ceil(overdue days) × 1.50` (currency units); renewal adds 14 days, max 2 renewals,
   blocked when an active reservation exists.
5. Deleting a resource is blocked while active loans exist.
6. Only admins may change roles, suspend members, or read audit logs.
