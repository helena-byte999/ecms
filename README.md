# Elderly Care Management System (ECMS)

[![CI](https://github.com/helena-byte999/ecms/actions/workflows/ci.yml/badge.svg)](https://github.com/helena-byte999/ecms/actions/workflows/ci.yml)

A full-stack web application that gives a care home one place to manage its clients, caregivers, contracts, weekly rotas and invoices, with a separate dashboard for administrators, caregivers and clients.

**Live demo: [ecms-omega.vercel.app](https://ecms-omega.vercel.app)** · try it as an administrator, caregiver or client, no sign-up needed ([details](#try-the-demo))
**Stack:** React · Sass · Node.js · Express · MongoDB

> This started as an undergraduate team project. This repository is my copy, rebuilt and documented for my portfolio. See [Team & my role](#team--my-role) and the [requirements & design](docs/requirements.md) I wrote.

---

## Overview

ECMS is role-based. Everyone signs in to the same system and sees only what they need:

- **Administrator** manages residents, caregivers, families and other admins, contracts, the weekly rota, invoices and care records, and downloads care reports.
- **Caregiver** runs the daily medicine round, writes the care log, records doctor's visits, and sees their shifts, contract and invoices.
- **Family member** has their own read-only login to their relative's care log, medicines, contract and invoices.
- **Client** (the resident) sees the same about themselves.

## Features

**Care records** (added in 2026, see the [requirements](docs/care-records-requirements.md)):

- **Medicine round**: every dose due today across the home, grouped by time; one tap for *given*, or *refused* / *missed* with a note; late doses stand out
- **Care log**: meals and drinks, personal care, wellbeing (mood, temperature, unwell), activities, incidents and notes, each stamped with who and when. Entries can't be edited or deleted; mistakes are fixed with a visible correction
- **Medicines**: each resident's list with times or "as needed", courses with an end date; stopping one keeps the history
- **Doctor's visits** update the resident's records automatically: medicines started or stopped and changes to allergies and conditions, with a before / after record in the log
- **Reports**: a care summary per resident (doses given, refused, missed and not recorded; incidents; visits; wellbeing; meals) and a home overview for admins, as **PDF and CSV**
- **Family access**: each relative gets their own read-only login, linked to one resident
- **Team admins**: admins can add other admins; you can't deactivate yourself or the last admin

**Running the home:**

- **Role-based dashboards** with server-side permission checks: people only ever see their own records
- **People**: client and caregiver profiles with medical notes, next of kin and emergency contacts; admins can edit them (changing an email keeps that person's invoices and rotas linked)
- **Deactivate / reactivate** accounts: records are kept, the person can't sign in and is left off new rotas
- **Contracts**: valid, expired and "no contract" at a glance, with end dates and a per-person history
- **Automatic weekly rota** from every active caregiver: shares differ by at most one shift, nobody works the same day twice, and caregivers per day is adjustable
- **Invoices**: due dates, paid / unpaid / overdue status, one-click "mark as paid", editable, in the care home's currency, and **downloadable as PDF** by admins and by the person billed
- **Passwords**: everyone can change their own; admins can set a temporary one
- **Search, sortable columns and paging** across the whole list, not just the visible page
- **Responsive**: on phones, tables turn into readable cards
- **Demo mode**: sample data, one-click role sign-in, nightly reset

## Screenshots

| Homepage | Sign in (demo) |
|----------|---------|
| ![ECMS homepage](docs/screenshots/home.png) | ![Sign-in page with one-click demo roles](docs/screenshots/login.png) |

| Medicine round (caregiver) | Care log (family member's view) |
|----------------------------|---------------------------------|
| ![Today's medicine round with doses given, due and refused](docs/screenshots/care-round.png) | ![A resident's care log seen by her family: allergy, conditions, doses and meals](docs/screenshots/care-family.png) |

| Admin dashboard | Caregiver dashboard (own shifts highlighted) |
|-----------------|----------------------------------------------|
| ![Admin dashboard with contracts and weekly rota](docs/screenshots/admin-dashboard.png) | ![Caregiver dashboard with weekly rota](docs/screenshots/caregiver-dashboard.png) |

<img src="docs/screenshots/mobile-home.png" alt="ECMS homepage on a phone" width="260">

_Screenshots use made-up demo data._

## Try the demo

On the sign-in page, choose **administrator**, **caregiver** or **family member**. You can also sign in normally:

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@example.com` | `ecms-demo` |
| Caregiver | `caregiver@example.com` | `ecms-demo` |
| Family member (Margaret Okafor's daughter) | `family@example.com` | `ecms-demo` |
| Client (Margaret Okafor) | `client@example.com` | `ecms-demo` |

Everything in the demo is fictional sample data and resets every night (03:00 UTC), so feel free to add, change or deactivate things. Through the day the sample staff keep recording routine care, leaving the most recent doses for you to record on the medicine round. Look at Margaret Okafor for a doctor's visit that started antibiotics. The demo accounts can't be deactivated or have their email, role or password changed, so they always work for the next visitor. The demo server sleeps when idle, so the first sign-in can take up to a minute.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 17 (Create React App), React Router, reactstrap, Sass |
| Backend | Node.js 22, Express |
| Database | MongoDB with Mongoose 8 |
| Auth & security | JSON Web Tokens, bcrypt, role checks, helmet, rate-limited sign-in |
| Testing & CI | 100 API checks against a throwaway MongoDB, run by GitHub Actions on every push |
| Hosting | Vercel (frontend), Render (API), MongoDB Atlas (database) |

## Requirements, UML and data model

The [requirements & design document](docs/requirements.md) has the original 2022 requirements, use-case, ER and class diagrams. Next to them are updated diagrams of the system as built, and a table of which use cases are done. In short:

- **User**: name, email, role (admin / caregiver / client / family), status (active / on-leave / in-active), contact details, medical notes; contains **Contracts**, **Next of Kin** and **Emergency Contact**. Family members link to one resident
- **Invoice**: client email, amount, type, description, date
- **Schedule**: week, dates, and the caregivers on duty each day
- **Medication**: resident, name, dose, times or "as needed", course dates, who added or stopped it and why, and the doctor's visit that started it
- **CareEntry**: resident, type (dose, meal, personal care, wellbeing, activity, incident, note, doctor's visit), when, author, details, and the entry it corrects

## Team & my role

This was a group project by **Ena Otuokon** (me), **Munachi Umeh**, **Hassan Hassan** and **Abdulhamid Tukur**, supervised by **Alexey Vedishchev**, and presented on 2 December 2022. The original team repository is [NabsCodes/ecms](https://github.com/NabsCodes/ecms).

**My contributions:**
- **Frontend**: built and styled the React views and components
- **Database**: designed the MongoDB schemas and data relationships
- **UML**: produced the use-case, ER and class diagrams ([see them](docs/requirements.md#original-diagrams-2022))
- **Requirements documentation**: wrote the requirements specification ([see it](docs/requirements.md))

## Running locally

**Prerequisites:** Node.js 22 and a MongoDB database (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
git clone https://github.com/helena-byte999/ecms.git
cd ecms

# API
cd server
cp .env.example .env        # fill in the values (see below); set DEMO_MODE=true for sample data
npm install
npm run dev                 # http://localhost:5001

# Frontend (second terminal)
cd client
cp .env.example .env        # set REACT_APP_DEMO=true to show the demo buttons
npm install
npm start                   # http://localhost:3000
```

### Tests

```bash
cd server
npm test    # API, care records and demo suites against a throwaway MongoDB; no setup needed
```

## Deploying

1. **Database: MongoDB Atlas.** Create a free cluster and a database user. Under *Network Access*, allow `0.0.0.0/0`, because Render's addresses change. Copy the `mongodb+srv://…` connection string.
2. **API: Render.** *New → Blueprint*, then pick this repo. [`render.yaml`](render.yaml) sets everything up. Paste the Atlas string into `mongoURLProduction`; leave `FrontEndHostProduction` for step 4.
3. **Frontend: Vercel.** Import the repo and set **Root Directory** to `client`. Add `REACT_APP_BackEndHost` (your Render URL), `REACT_APP_DEMO=true` and `REACT_APP_CURRENCY`, then deploy.
4. Back in Render, set `FrontEndHostProduction` to your Vercel URL (no trailing slash) so the API accepts its requests.

### Environment variables

`server/.env`

| Variable | Description |
|----------|-------------|
| `LocalPort` | Port for the API locally, e.g. `5001` |
| `mongoURL` / `mongoURLProduction` | MongoDB connection strings for local and production |
| `jwtSecret` | Secret used to sign sign-in tokens (any long random string) |
| `FrontEndHostProduction` | Production frontend URL; the only other origin the API accepts |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Creates the first admin on startup if none exists (accounts can only be created by an admin) |
| `DEMO_MODE` | `true` for a public demo: sample data, one-click demo sign-in, nightly reset. **Never on a database with real care records.** |
| `DEMO_PASSWORD` | Password for the demo accounts (default `ecms-demo`) |
| `HOME_TIMEZONE` | The care home's time zone for medicine times (default `Europe/London`) |
| `LOGIN_RATE_LIMIT` | Sign-in attempts allowed per IP per 15 minutes (default 20) |
| `ROTA_PER_DAY` | Default caregivers per day when generating a rota (default 5) |

`client/.env`

| Variable | Description |
|----------|-------------|
| `REACT_APP_BackEndHost` | URL of the API |
| `REACT_APP_DEMO` | `true` shows the "Try as …" buttons (needs `DEMO_MODE=true` on the API) |
| `REACT_APP_CURRENCY` | Currency for invoices, as an ISO code (`GBP`, `NGN`, `USD`…). Each deployment serves one care home, so it's set per deployment. Default `GBP`. |
| `REACT_APP_LOCALE` | Number and date formatting, e.g. `en-GB`, `en-NG`. Default `en-GB`. |
| `REACT_APP_ORG_NAME` / `REACT_APP_ORG_LINE` | Care home name and tagline at the top of invoice PDFs. Default `ECMS` / `Elderly Care Management`. |

> Real secrets are never committed. Only `.env.example` templates are tracked, and `.env` is gitignored.

## Credits

Care-home footage on the landing page: [Pexels video 7522210](https://www.pexels.com/video/7522210/), used under the [Pexels licence](https://www.pexels.com/license/).

## License

No license was specified on the original project, so all rights remain with the original authors. This copy is published for portfolio and educational purposes.
