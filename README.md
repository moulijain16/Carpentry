# Gurpreet Furniture Works — enquiry & order desk

A custom-furniture carpenter's enquiry book, replaced with a phone-friendly web
app. Customers send an enquiry from a public form; Gurpreet and his workshop boys
sign in to one shared dashboard and move each job from **New → Accepted → In
Progress → Delivered**, tracking prices, advances and promised delivery dates.

Built from the requirements call in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md),
which traces every feature back to what Gurpreet actually asked for — including
the ambiguous points and how they were resolved.

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3100>. The customer form is at `/`, the workshop login at
`/login`.

Development credentials (from `.env.local`):

| Username | Password |
|---|---|
| `gurpreet` | `workshop123` |

To fill the dashboard with realistic sample orders — including one due in two
days, one overdue, one delivered, one cancelled and one rejected — start the
server and then run:

```bash
npm run seed
```

## Screens

| Route | Who | What |
|---|---|---|
| `/` | Public | Enquiry form: contact details, one or more furniture items with sizes and quantities, delivery or pickup, installation, optional reference photo. Errors appear beside the field that caused them; on success the page shows the enquiry number. |
| `/login` | Public | Shared workshop login. Wrong credentials show an error on the same page. |
| `/admin` | Signed in | All enquiries, newest first. Status filter tabs with counts, search by name or order number, colour-coded status badges, and a banner listing anything due within three days. Edit / Cancel / Reject / Reopen / Delete on each row. |
| `/admin/[id]` | Signed in | Full detail: stage stepper, customer details and items (editable), reference photo, the fields for the current stage, a payment summary with the balance calculated, and the status history. |

## How it is built

- **Next.js 16** (App Router) with React 19 and Tailwind v4.
- **SQLite via `node:sqlite`** — Node's built-in driver, so there is no native
  module to compile and no database server to run. The file lives at
  `data/workshop.db` (override with `DATABASE_FILE`).
- **No runtime dependencies beyond Next and React.** Auth, password hashing and
  the SMS call are all built on Web Crypto and `fetch`.

```
src/
  lib/
    domain.ts       Statuses, the transition rules, urgency and balance maths
    db.ts           SQLite connection and schema
    enquiries.ts    All reads and writes, transactional
    validation.ts   Parses and validates the customer form
    auth.ts         Session signing, password hashing, login rate limiting
    notify.ts       New-enquiry SMS (Twilio) with a recorded fallback
  app/
    page.tsx        Customer enquiry form
    login/          Workshop login
    admin/          Dashboard and detail view
    api/            Enquiry CRUD, status changes, photo, login/logout
  proxy.ts          Redirects signed-out visitors away from /admin
```

The status rules live in one place — `ALLOWED_TRANSITIONS` in
[`src/lib/domain.ts`](src/lib/domain.ts) — and are enforced on the server, so a
stage cannot be skipped even by calling the API directly.

## Configuration

Copy `.env.example` to `.env.local`. Everything except the credentials is optional.

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME` | Shared login name (default `gurpreet`) |
| `ADMIN_PASSWORD_HASH` | PBKDF2 hash — generate with `npm run hash-password -- "new password"` |
| `SESSION_SECRET` | Signs the session cookie. **Required in production.** |
| `DATABASE_FILE` | SQLite path (default `./data/workshop.db`) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `WORKSHOP_PHONE_NUMBER` | SMS alert on each new enquiry |

**The SMS alert does not send until the Twilio variables are filled in.** Until
then every alert is still written to the `notifications` table and the server
log, so nothing is lost — but Gurpreet will not get a text. This needs an account
he signs up for; see judgment call J4 in the requirements doc.

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
```

## Before this goes live

Small, but they matter for a real workshop:

1. **Set `SESSION_SECRET`** to a random value and change the password. In
   production the app throws on the first request rather than falling back to a
   generated secret, so this is not something that can be forgotten silently.
2. **Serve over HTTPS.** The session cookie is marked `secure` in production, so
   plain HTTP will not keep anyone signed in.
3. **Back up `data/workshop.db`.** It is a single file; a nightly copy is enough.
4. **Decide on the SMS provider** so the new-enquiry alert actually sends.
