# Merchke — Setup & Deployment

Kenya's creative industry hub: merch, events & tickets, football, creative services (Hire),
podcasts, jobs, ads and an AI support agent (Merchi). Django 5.2 + DRF backend, Next.js 16 frontend.

## Backend (Django)

```bash
cd merchke_backend
python -m venv venv
venv\Scripts\activate            # Windows  (source venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
copy .env.example .env           # then edit
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo       # optional: demo sellers, events, services, jobs, podcasts, ads
python manage.py runserver 127.0.0.1:8001
python manage.py test            # 44 tests covering payments, escrow, tickets, fees, chat…
```

Demo logins created by `seed_demo` are `<name>@merchke.test` (e.g. `demo-buyer`, `demo-sauti`,
`demo-kits`); the password is `DEMO_PASSWORD` in `core/management/commands/seed_demo.py`.

## Frontend (Next.js)

```bash
cd merchke_frontend
npm install
copy .env.example .env.local
npm run dev
```

---

## How money moves

All payments are M-Pesa STK Push and go through **one dispatcher** (`payments/services.py`):
`initiate_payment(purpose=…)` records an `MpesaTransaction`; Safaricom's callback (or simulation)
runs the handler for that purpose.

| Purpose | Amount | On payment |
|---|---|---|
| `order` | cart total (+ KSh 200 delivery per seller) | orders confirmed, funds **held in escrow** |
| `tickets` | ticket price × qty | QR tickets issued, escrow held until 2 days after the event |
| `listing_fee` | KSh 130 per product | product goes live |
| `job_fee` | KSh 500 per job post | job goes live |
| `ad` | prepaid budget | ad goes live |
| `event_boost` | prepaid budget (min KSh 500) | event featured on homepage |

**Escrow:** buyer pays → `EscrowTransaction(held)` → vendor marks shipped (7-day clock starts) →
buyer confirms receipt (`POST /api/escrow/{order_id}/release/`) or the clock runs out → released to
the vendor minus 10% commission. A dispute (`POST /api/escrow/{order_id}/dispute/`) freezes the funds
until an admin resolves it (Django admin → Disputes → "Resolve: refund buyer" / "release to vendor").

**Payouts to vendors are manual for now:** released escrow shows in each vendor's Payouts tab and in
Django admin; send the M-Pesa B2C payment yourself (B2C API integration is a future step).

**Simulation mode:** with no Daraja credentials, `MPESA_SIMULATE` defaults to on and every STK push
succeeds instantly — handy locally, dangerous in production.

## Scheduled tasks

`python manage.py process_due_tasks` expires unpaid listing/job fees after 10 minutes (and emails the
vendor), auto-releases escrow, and switches off finished ads and boosts. The listing-fee status
endpoint and escrow detail endpoint also apply these rules on read, but production should run the
command every 5 minutes — on Render add a **Cron Job** service with the same repo/env:

```
Schedule: */5 * * * *
Command:  python manage.py process_due_tasks
```

## Key API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/accounts/register/ · /login/ | Auth (token) |
| GET/POST | /api/products/ | Catalogue (`?search=&type=&product_type=&min_price=`) / create (+KSh 130 STK) |
| GET | /api/products/{id}/listing-fee-status/ | Poll listing fee (POST `…/listing-fee/retry/` to resend) |
| POST | /api/orders/checkout/ | Cart → orders (one per vendor) + single STK push |
| GET | /api/orders/vendor/ · POST /api/orders/{id}/ship/ | Vendor fulfilment |
| GET | /api/payments/transactions/{id}/ | Poll any STK payment (POST `…/retry/` to resend) |
| POST | /api/payments/mpesa/callback/ | Safaricom callback |
| GET/POST | /api/escrow/{order_id}/ · release/ · dispute/ | Buyer protection |
| GET/POST | /api/events/ · /api/events/{slug}/ | Events (`?category=&city=&date_from=&date_to=`) |
| POST | /api/events/{id}/purchase-tickets/ · /boost/ | Tickets / paid promotion |
| GET/POST | /api/tickets/mine/ · /api/tickets/{qr}/verify/ | My QR tickets / gate check-in |
| GET/POST | /api/jobs/ · /api/jobs/{id}/apply/ | Job board (+KSh 500 STK to post) |
| GET/POST | /api/services/ · /api/services/{id}/book/ | Hire marketplace & bookings |
| GET/POST | /api/podcasts/ · /api/podcasts/{slug}/ | Podcasts & episodes |
| POST/GET | /api/ads/create/ · /api/ads/serve/?page=&ad_type= | Advertising |
| POST | /api/chat/ | Merchi AI support (20 msgs/session/day) |

## Deployment checklist

1. `python manage.py makemigrations --check && python manage.py migrate` (Render runs migrate on deploy via the Procfile)
2. Render env vars: `SECRET_KEY`, `DEBUG=False`, `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
   `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL`, the five `MPESA_*` values, `CLOUDINARY_URL`, `EMAIL_*`,
   `ANTHROPIC_API_KEY`
3. Add the Render Cron Job above
4. Netlify env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`
5. Push to GitHub — Render and Netlify auto-deploy
6. Smoke test buyer flow: register → browse → buy → escrow held → vendor ships → confirm receipt
7. Smoke test vendor flow: onboard (set M-Pesa number) → add product → pay KSh 130 → product live → receive order

## Vendor types

`artist`, `dj`, `creative`, `jersey`, `brand`, `events`, `digital`, `makeup`, `tattoo`, `biker`, `other`
