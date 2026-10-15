# Resume Shortlister ATS  

Modern ATS web app for recruiters with resume parsing, AI insights, candidate pipeline management, and admin analytics.

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Axios
- Backend: Node.js, Express, Multer, Mongoose
- Database: MongoDB
- AI: Gemini API
- Email: Brevo transactional API
- Auth: JWT + bcrypt

## Core Features

- Recruiter authentication (register/login)
- Resume upload and ATS scoring (PDF, multiple files)
- Skill match and missing-skill analysis
- Experience detection from resume text (Gemini + fallback heuristic)
- Candidate status workflow: `New`, `Screening`, `Interview`, `Shortlisted`, `Rejected`
- Auto email notifications on `Shortlisted` and `Rejected`
- Candidate notes
- AI buttons:
  - Generate Candidate Summary
  - Generate Interview Questions
- Candidate comparison mode (select 2 and compare)
- Admin dashboard (role-protected)
- Dark mode
- CSV export for shortlisted candidates

## Authentication and Roles

- Public registration creates only `recruiter` users.
- No one can self-register as `admin`.
- `admin` users can access Admin Dashboard.

To create an admin:
1. Register a normal recruiter account.
2. Update that user's `role` to `admin` directly in MongoDB (`users` collection).

## Project Structure

```text
resume-shortlister/
  backend/
    controllers/
    middleware/
    models/
    routes/
    utils/
    server.js
  frontend/
    src/
      pages/
      components/
      App.jsx
      index.css
    public/
```

## Environment Variables (backend/.env)

Use `backend/.env.example` as template.

```env
MONGO_URI=mongodb://127.0.0.1:27017/resume_shortlister
PORT=5000
CORS_ORIGIN=http://localhost:5173

JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

BREVO_API_KEY=
BREVO_SENDER_EMAIL=team.hr.co206@gmail.com
BREVO_SENDER_NAME=HR Team
COMPANY_NAME=Your Company
```

Notes:
- Brevo must have transactional/smtp activation enabled, otherwise email sending can fail with `403`.
- Keep `.env` secrets private.

## Local Setup

### 1) Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2) Run backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:5000`.

### 3) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`.

## App Usage

1. Open frontend URL.
2. Register or login.
3. In Recruiter Workspace:
   - select role template / add JD
   - upload PDFs
   - analyze and manage candidates
4. If logged in as admin, switch to Admin Dashboard from top navigation.

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Resume (JWT required)

- `POST /api/resumes/upload`
- `GET /api/resumes/results`
- `GET /api/resumes/summary`
- `GET /api/resumes/admin/overview` (admin only)
- `POST /api/resumes/:id/generate-summary`
- `POST /api/resumes/:id/generate-interview-questions`
- `PATCH /api/resumes/:id/status`
- `PATCH /api/resumes/:id/notes`

## Build and Quality

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
node --check server.js
```
