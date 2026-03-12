# RSVP OTP Flow – Setup Guide

## Overview

The RSVP flow uses:
1. **OTP verification** – User enters email, receives 6-digit code, confirms RSVP
2. **Duplicate prevention** – Each email can only RSVP once
3. **Email** – OTP and confirmation emails sent via Gmail

---

## Part 1: Gmail Setup (Required for Emails)

### 1.1 Create Gmail App Password

1. Go to [Google Account](https://myaccount.google.com/)
2. **Security** → **2-Step Verification** (enable if not already)
3. **Security** → **App passwords** → **Select app** → **Mail** → **Generate**
4. Copy the 16-character password (e.g. `abcd efgh ijkl mnop`)

### 1.2 Add Credentials

**Local development** – create `server/.env`:

```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-app-password
```

**Production** – Firebase Console:
1. Project Settings → **Service accounts**
2. Or: Firebase Console → **Functions** → **Environment variables**
3. Add `EMAIL_USER` and `EMAIL_PASS`

---

## Part 2: Local Development

### 2.1 Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Logged in: `firebase login`

### 2.2 Firestore Access (Avoid PERMISSION_DENIED)

The Functions emulator uses **production Firestore**. Two options:

**Option A – Use gcloud credentials (recommended):**

```bash
gcloud auth application-default login
```

Select your Firebase project when prompted.

**Option B – Use in-memory OTP (bypasses Firestore for OTP only):**

Add to `server/.env`:

```
USE_IN_MEMORY_OTP=true
```

This stores OTPs in memory and skips the duplicate check if Firestore fails. You can test **sending** the OTP email. The **verify** step still needs Firestore to save the guest, so Option A is required for the full flow.

### 2.3 Start the App

**Terminal 1 – API (Functions emulator):**

```bash
cd server && npm run serve
```

Wait until you see: `✔ functions: Emulator started at http://localhost:5001`

**Terminal 2 – Client:**

```bash
npm run dev:client
```

Or run both together:

```bash
npm run dev
```

### 2.4 Test the Flow

1. Open http://localhost:5173
2. Go to a wedding page: http://localhost:5173/wedding/YOUR_WEDDING_ID
3. Fill the RSVP form and click **Send Verification Code**
4. Check the email inbox for the 6-digit OTP
5. Enter the OTP and click **Confirm RSVP**

### 2.5 Troubleshooting Local

| Error | Fix |
|-------|-----|
| `PERMISSION_DENIED` | Run `gcloud auth application-default login` |
| `Failed to fetch` / CORS | Ensure emulator is running; client uses Vite proxy |
| `Email service not configured` | Add `server/.env` with EMAIL_USER and EMAIL_PASS |
| `Invalid login` / auth error | Use App Password, not normal Gmail password |
| Port in use | Change ports in `firebase.json` (e.g. UI: 4001) |

---

## Part 3: Production Deployment

### 3.1 Deploy Firebase Functions

```bash
cd server
npm run deploy
```

### 3.2 Set Firebase Environment Variables

Firebase Console → **Functions** → **Environment variables** (or Project Settings):

| Variable | Value |
|----------|-------|
| `EMAIL_USER` | your-gmail@gmail.com |
| `EMAIL_PASS` | your-app-password |
| `CLIENT_URL` | https://yoursite.netlify.app |

For multiple sites: `https://site1.com,https://site2.com`

### 3.3 Set Netlify (or Host) Environment Variables

For the client build:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://us-central1-wedding-invitation-slideshow.cloudfunctions.net/api` |

### 3.4 Rebuild and Deploy Client

```bash
npm run build:client
```

Then deploy the `client/dist` folder to Netlify (or your host).

---

## Part 4: Flow Summary

```
User fills RSVP form
       ↓
Clicks "Send Verification Code"
       ↓
API: POST /api/weddings/:id/guests/send-otp
       ↓
Check duplicate email → 409 if already used
       ↓
Generate 6-digit OTP, store in Firestore (otpCodes)
       ↓
Send OTP email via Gmail
       ↓
User enters OTP, clicks "Confirm RSVP"
       ↓
API: POST /api/weddings/:id/guests/verify-otp
       ↓
Verify OTP, create guest in Firestore
       ↓
Send confirmation emails (to couple + guest)
       ↓
Success
```

---

## Quick Checklist

- [ ] Gmail App Password created
- [ ] `server/.env` has EMAIL_USER and EMAIL_PASS (local)
- [ ] `gcloud auth application-default login` run (local)
- [ ] Emulator running: `cd server && npm run serve`
- [ ] Client running: `npm run dev:client`
- [ ] Production: Firebase env vars set (EMAIL_USER, EMAIL_PASS, CLIENT_URL)
- [ ] Production: Netlify env var VITE_API_URL set
- [ ] Production: Functions deployed
