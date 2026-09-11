# Requirements — Gurpreet Furniture Works

Every line below traces back to something Gurpreet said in the briefing call.
Quotes are his words; the "Built as" column is what the code actually does.

## 1. Who uses what

| | Customer | Gurpreet + workshop boys |
|---|---|---|
| Pages | `/` enquiry form | `/login`, `/admin`, `/admin/[id]` |
| Can see status? | No — *"status is only for me and my boys"* | Yes |
| Login? | No | Yes, one shared login |

## 2. Customer enquiry form (`/`)

| Field | Mandatory | Notes |
|---|---|---|
| Name | Yes | |
| Phone | Yes | At least 10 digits |
| Furniture type | Yes | Dropdown — *"otherwise people write all sorts of nonsense"* |
| ↳ "Other" description | Yes, if Other picked | *"sometimes people want... a TV unit or a temple cabinet"* |
| Measurements | Yes | Free text — *"they never have exact numbers anyway"* |
| Quantity | Yes | Plain number input, *"no need to make it fancy"* |
| Wood / finish | No | |
| Special requirements | No | Free text — *"dropdown for every little thing will be too complicated"* |
| Delivery or pickup | Yes | Two large buttons |
| ↳ Delivery address | Yes, if Delivery picked | See judgment call J1 |
| Installation needed | Yes | |
| Reference photo | No | One image, ≤ 5 MB |

- **Multiple items per enquiry** — *"sometimes they want a bed and wardrobe together"*.
  An "Add another item" button; each item carries its own type, measurements,
  quantity, wood and special requirements.
- **Errors sit beside the field that caused them** — *"show the error right next
  to that field only, so the customer knows exactly what they missed"*.
- **Success stays on the same page** — *"just show a message saying enquiry
  received we will contact you soon. No need to open a new page."* The message
  includes the enquiry number.
- Same customer ordering the same thing twice creates two separate enquiries —
  *"happens sometimes when they want matching wardrobes for two rooms"*.

## 3. Status pipeline

```
New ──▶ Accepted ──▶ In Progress ──▶ Delivered
 │           │              │
 ├─▶ Rejected┘              │      (Rejected / Cancelled can be reopened
 └─▶ Cancelled ◀────────────┘       back to New)
```

- **Order is enforced.** *"I can't have a delivered status before I've even
  started the work, that makes no sense."* Attempting a jump returns an error
  naming the allowed next steps.
- **Delivered is final.**
- **Cancelled ≠ Rejected.** *"Cancelled is when the customer backs out, rejected
  is when I decide I can't take the work."*
- **Rejected can be reopened.** *"Sometimes a customer comes back after I reject
  them... change it back to New."*
- Nothing is hidden — cancelled and rejected enquiries stay in the list,
  *"maybe greyed out or in red colour"*.

## 4. Fields captured at each stage

| Stage | Fields | Source |
|---|---|---|
| New | Only what the customer filled in | *"nothing extra from my side"* |
| Accepted | Estimated price, advance received, promised delivery date | *"estimated price also I should put in when I accept. And delivery date"* |
| In Progress | Work start date (recorded automatically), workshop notes | *"the date gets recorded automatically when I move it to In Progress"* |
| Delivered | Actual delivery date, balance paid yes/no, delivery notes | *"customer was not home or installation pending"* |

**Balance is calculated, never typed:** `balance = estimated price − advance`.
*"The system should automatically calculate balance as total price minus advance."*

## 5. Dashboard (`/admin`)

- **Newest first** — *"I want to see what just came in at the top."*
- **Each row shows** order number, customer name, phone, furniture type, status
  badge, delivery date — *"that's enough to know what's going on without opening
  each one."*
- **Colour badge per status** — *"I can see at a glance without reading too much."*
- **Filter tabs** for All / New / Accepted / In Progress / Delivered / Cancelled
  / Rejected, each with a count.
- **Search** by customer name or order number — *"sometimes customer calls and
  gives me their order number."* (Phone search was explicitly not wanted.)
- **Row buttons:** Edit, Cancel, Delete — plus Reject where it applies, and
  Reopen for cancelled/rejected rows.
- **Delete is permanent**, cancel is not — *"delete means it's gone completely."*
- **Morning highlight** — orders promised within 3 days are pinned in a banner at
  the top and their rows get a coloured edge; overdue ones show in red.
  *"Every morning I want to see which orders are due for delivery in the next few
  days so I don't break any promises."*
- Tapping a row opens the full detail view — *"all the measurements, notes,
  photos, everything."*

## 6. Login

- One shared username and password — *"me and my boys will share it."*
- Anyone signed in can do everything — *"I trust my boys, no need to restrict."*
- Wrong password shows an error on the same page.
- Visiting `/admin` without a session redirects to `/login`.
- *"The login should be secure"* → password stored as a PBKDF2-SHA256 hash, session
  cookie is HMAC-signed, `httpOnly`, and expires after 12 hours; repeated failed
  logins from one address are locked out for 5 minutes.

## 7. Mobile

*"Mostly on my phone only, I'm in the workshop all day."* Every screen is built
mobile-first: single column, large tap targets, horizontally scrolling filter
tabs, no horizontal page scroll.

## 8. New-enquiry alert

*"I should get a notification on my phone when a new enquiry comes in. SMS or
something like that."* Sent via Twilio when the `TWILIO_*` environment variables
are set. When they are not, the alert is still written to the `notifications`
table and the server log, so nothing is silently dropped. See judgment call J4.

---

## Judgment calls

Points where the brief was ambiguous or self-contradictory, and what was decided.

**J1 — Address: mandatory or conditional?**
He first said *"address is important... add that to the form, make it mandatory"*,
then later said *"if they select delivery then ask for address, if they select
pickup no need for address."* The later, more specific instruction wins: the
address field appears and is required only when Delivery is selected. Gurpreet
can still add an address by hand from the admin edit screen (useful for a
measurement visit on a pickup order).

**J2 — Cancelled enquiries can be reopened.**
He only asked for this explicitly for rejected ones. A customer who backs out can
just as easily come back, so Reopen is offered for both. If he prefers it locked
to rejected only, remove `Cancelled: ["New"]` from `ALLOWED_TRANSITIONS` in
`src/lib/domain.ts`.

**J3 — Accepting requires a price and a promised date.**
He said he should be *"able to"* enter these when accepting, which suggests
optional. But his own definition of done is *"not lose track of any promised
delivery dates"*, and the morning highlight cannot work without a date. So both
are required to move an enquiry to Accepted; the advance stays optional, since
money may not have changed hands yet. Both remain editable afterwards.

**J4 — SMS needs an account he has to pay for.**
No SMS provider was discussed. The code is wired for Twilio and works as soon as
credentials are added; until then the alert is recorded rather than sent, and the
New count on the dashboard covers the gap. This needs a decision from Gurpreet.

**J5 — Rejecting is allowed from Accepted, not just New.**
He described rejecting as something he does when he cannot take the work, which
he may only realise after accepting. Cancel is available at any point before
delivery.

## Deliberately not built

Each of these was ruled out by Gurpreet, not overlooked:

- **Customer-facing status tracking** — *"I don't want them logging in or checking
  anything."*
- **Automatic messages to customers on acceptance** — *"I'll call them myself."*
- **Per-user accounts or roles** — *"anyone with the login can do everything."*
- **Search by phone number** — *"if I remember the name that's enough."*
