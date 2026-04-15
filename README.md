# InterviewPrep

Full-stack interview preparation platform with React frontend, Express backend, PostgreSQL persistence, and AI-assisted evaluation.

## Stack

- Frontend: React, Vite, TypeScript, Zustand
- Backend: Express, TypeScript, PostgreSQL
- AI: Groq API for question and system design evaluation
- Code execution: Judge0 API

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL (if running outside Docker)

## Environment Setup

1. Copy environment examples:
   - root: `.env.example` to `.env`
   - backend: `backend/.env.example` to `backend/.env`
   - frontend: `frontend/.env.example` to `frontend/.env`
2. Fill required keys:
   - `GROQ_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET`

## Local Development

### Option A: Docker

1. Start services:
   - `docker compose up --build`
2. Backend runs at http://localhost:5000
3. Frontend runs at http://localhost:5173

### Option B: Local Node processes

1. Backend:
   - `cd backend`
   - `npm install`
   - `npm run migrate`
   - `npm run seed`
   - `npm run dev`
2. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Database Workflow

- Migrations live in `backend/migrations`
- Run migrations:
  - `cd backend && npm run migrate`

## Quality Checks

Backend:
- Build: `cd backend && npm run build`
- Test: `cd backend && npm test`

Frontend:
- Build: `cd frontend && npm run build`
- Test: `cd frontend && npm test`

## CI

GitHub Actions workflow is defined in `.github/workflows/ci.yml` and runs build and tests for backend and frontend on push and pull request.
