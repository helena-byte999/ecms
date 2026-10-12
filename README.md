# Elderly Care Management System (ECMS)

A full-stack web application that connects elderly individuals with caregivers and gives administrators a single place to manage people, contracts, schedules, and invoices.

**Live demo:** _coming soon_ · **Stack:** React · Tailwind CSS · Sass · Node.js · Express · MongoDB

> This started as an undergraduate team project. This repository is my copy, cleaned up and documented for my portfolio. See [Team & my role](#team--my-role).

---

## Overview

ECMS is a role-based care-management platform with three types of users, each with their own dashboard and permissions:

- **Admin** — manages caregivers, clients, contracts, schedules, and invoices across the whole system.
- **Caregiver** — views their assigned contracts, schedules, invoices, and profile.
- **Client (elderly individual / family)** — views their contracts, invoices, and profile.

Authentication is handled with JSON Web Tokens and hashed passwords, and all care data is stored in MongoDB.

## Features

- Registration and JWT-based login for all three roles
- Admin dashboard to create and manage caregivers and clients
- Contract management (start/end dates, descriptions) linked to users
- Weekly schedule management for caregivers
- Invoicing (amount, type, description, date) per user
- Detailed user profiles: personal details, medical info, next of kin, and emergency contacts
- Responsive UI built with React, Tailwind CSS, and Sass

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Create React App), Tailwind CSS, Sass |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JSON Web Tokens (JWT), bcryptjs |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## Data model

The core schemas (defined in [`server/models`](server/models)):

- **User** — email, name, date of birth, role, address, phone, status, staff type, medical info, password; embeds **Contracts**, **Next of Kin**, and **Emergency Contact**.
- **Invoice** — email, amount, type, description, date created.
- **Schedule** — week, start/end dates, schedule entries.

## Team & my role

This was a group project. The original team repository is [NabsCodes/ecms](https://github.com/NabsCodes/ecms).

**My contributions:**
- **Frontend** — built and styled the React views and components
- **Database** — designed the MongoDB schemas and data relationships
- **UML** — produced the system's UML diagrams
- **Requirements documentation** — wrote the requirements specification

## Running locally

**Prerequisites:** Node.js 18+ and a MongoDB database (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. Clone
git clone https://github.com/helena-byte999/ecms.git
cd ecms

# 2. Backend
cd server
cp .env.example .env        # then fill in the values (see below)
npm install
npm run dev                 # starts on http://localhost:5001

# 3. Frontend (in a second terminal)
cd client
cp .env.example .env        # then fill in the values
npm install
npm start                   # opens http://localhost:3000
```

### Environment variables

`server/.env`

| Variable | Description |
|----------|-------------|
| `LocalPort` | Port for the API, e.g. `5001` |
| `mongoURL` | MongoDB connection string for local dev |
| `mongoURLProduction` | MongoDB connection string for production |
| `jwtSecret` | Secret used to sign JWTs (any long random string) |
| `FrontEndHost` / `BackEndHost` | Local frontend/backend URLs |
| `FrontEndHostProduction` | Production frontend URL |

`client/.env`

| Variable | Description |
|----------|-------------|
| `REACT_APP_BackEndHost` | URL of the API the frontend calls |

> **Note:** real secrets are never committed — only `.env.example` templates are tracked, and `.env` is gitignored.

## License

No license was specified on the original project, so all rights remain with the original authors. This copy is published for portfolio and educational purposes.
