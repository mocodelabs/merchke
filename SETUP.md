# Merchke — Setup Guide

## Backend (Django)

```bash
cd merchke_backend

# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install django djangorestframework django-cors-headers pillow requests

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create a superuser
python manage.py createsuperuser

# Start dev server
python manage.py runserver
```

API runs at: http://localhost:8000

---

## Frontend (Next.js)

```bash
cd merchke_frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

---

## M-Pesa Setup (Daraja API)

1. Register at https://developer.safaricom.co.ke
2. Create an app → get Consumer Key & Consumer Secret
3. Add your Sandbox credentials to `core/settings.py`:

```python
MPESA_CONSUMER_KEY    = 'your_key'
MPESA_CONSUMER_SECRET = 'your_secret'
MPESA_SHORTCODE       = '174379'      # Sandbox shortcode
MPESA_PASSKEY         = 'your_passkey'
MPESA_CALLBACK_URL    = 'https://your-ngrok-url.com/api/payments/mpesa/callback/'
```

4. For local testing, use ngrok to expose your callback URL:
```bash
ngrok http 8000
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/accounts/register/ | Register user |
| POST | /api/accounts/login/ | Login → token |
| GET | /api/vendors/ | List vendors |
| GET | /api/products/ | List products |
| POST | /api/payments/mpesa/stk-push/ | Initiate M-Pesa STK |
| POST | /api/payments/mpesa/callback/ | M-Pesa callback (Safaricom) |
| GET | /api/events/ | List events |

---

## Vendor Types

| Type | Slug | Use case |
|------|------|----------|
| Artist / Musician | `artist` | Merch, signed items |
| DJ | `dj` | Mixes, merchandise |
| Creative | `creative` | Podcast, comedy, content |
| Jersey Vendor | `jersey` | Jerseys with size variants |
| Local Brand | `brand` | Clothing, accessories |
| Events Organizer | `events` | Ticket sales |
| Digital Products | `digital` | Beats, presets, e-books |
