# CLAUDE.md — Gemawi Pro Accounting System

## Project Overview

**Gemawi Pro** (نظام محاسبة جيماوي برو) is a full-stack accounting and business management system built for Arabic-speaking organizations. It provides employee management, payroll, attendance tracking, expense/revenue tracking, real-time chat, task management, and role-based access control.

- **Production domain**: gymmawy.net
- **Primary language**: Arabic (RTL interface), code in English
- **Multi-currency**: EGP, USD, SAR, AED with exchange rates

## Architecture

**Monorepo** with two main applications under `gymawy_acc-main/`:

```
gymawy_acc-main/
├── backend/          # Express.js REST API (Node.js + TypeScript)
│   ├── src/
│   │   ├── server.ts           # Entry point — Express + Socket.IO setup
│   │   ├── config/             # DB connection, permissions config
│   │   ├── controllers/        # Route handlers (one per domain)
│   │   ├── middleware/         # auth, permission, validation
│   │   ├── models/            # Mongoose schemas (MongoDB)
│   │   ├── routes/            # Express routers (index.ts aggregates all)
│   │   ├── services/          # Business logic (email, notifications, PDF, daily reports)
│   │   ├── jobs/              # Cron jobs (daily reports, selfie cleanup)
│   │   ├── scripts/           # Admin scripts (seed data, migrations)
│   │   └── utils/             # JWT helpers, mongoose utilities
│   └── tests/                 # Jest unit tests
├── src/              # React frontend (Vite + TypeScript)
│   ├── App.tsx                # Root component with all routes
│   ├── components/            # Shared UI components
│   │   └── ui/                # Base UI primitives
│   ├── pages/                 # Page-level components (one per route)
│   ├── store/                 # Zustand state stores
│   ├── services/api.ts        # Axios API client (single file)
│   ├── types/index.ts         # TypeScript interfaces (single file)
│   ├── hooks/                 # Custom React hooks
│   ├── i18n/                  # Arabic/English translations
│   ├── constants/             # Permission constants
│   └── utils/                 # Formatters, currency, export helpers
├── docker-compose.yml         # Backend + frontend containers
├── Dockerfile.backend
├── Dockerfile.frontend
└── nginx.conf                 # Frontend serving config
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite 4** — dev server (port 5173) with proxy to backend
- **Tailwind CSS 3** — utility-first styling (`tailwind.config.js` has custom brand colors, Arabic fonts)
- **Zustand** — state management (stores: `authStore`, `dataStore`, `notificationStore`, `settingsStore`)
- **React Router v6** — client-side routing
- **Axios** — HTTP client with auth interceptor
- **Socket.IO Client** — real-time messaging
- **Recharts** — dashboard charts
- **Lucide React** — icons
- **jsPDF / xlsx** — PDF and Excel export

### Backend
- **Express.js 4** with TypeScript
- **MongoDB** via **Mongoose 8**
- **JWT** authentication (`jsonwebtoken`)
- **Socket.IO** — real-time messaging and notifications
- **bcryptjs** — password hashing
- **Helmet + CORS + rate-limit** — security middleware
- **Nodemailer** — email service
- **PDFKit** — server-side PDF generation
- **node-cron** — scheduled jobs
- **Multer** — file uploads

### Testing
- **Jest 29** + **ts-jest** — backend unit tests
- **Supertest** — HTTP endpoint testing
- Tests in `backend/tests/` — run with `npm test` from `backend/`

## Development Commands

### Frontend (from `gymawy_acc-main/`)
```bash
npm run dev        # Start Vite dev server on port 5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

### Backend (from `gymawy_acc-main/backend/`)
```bash
npm run dev        # Start with nodemon (auto-reload)
npm run build      # TypeScript compilation to dist/
npm start          # Run compiled JS from dist/
npm test           # Run Jest tests
npm run test:watch # Watch mode
```

### Admin Scripts (from `gymawy_acc-main/backend/`)
```bash
npm run create-admin           # Create super admin user
npm run seed:permissions       # Seed roles and permissions
npm run seed:sample            # Seed sample data
npm run migrate:content-types  # Run content type migration
```

### Docker Deployment
```bash
docker-compose up -d --build   # Build and start both services
```

## Key Patterns & Conventions

### Backend Naming
- Controllers: `<domain>.controller.ts` (e.g., `employee.controller.ts`)
- Routes: `<domain>.routes.ts` — registered in `routes/index.ts`
- Models: PascalCase filenames (e.g., `Employee.ts`, `LeaveRequest.ts`)
- All API routes prefixed with `/api/`

### Frontend Naming
- Pages: PascalCase (e.g., `AttendanceManagement.tsx`) — one component per file
- Components: PascalCase in `components/`
- Stores: camelCase with `Store` suffix (e.g., `authStore.ts`)
- Single `api.ts` service file for all HTTP calls
- Single `types/index.ts` for all TypeScript interfaces

### Authentication Flow
1. Frontend sends login to `/api/auth/login`
2. Backend returns JWT token + user object
3. Token stored in `localStorage` under key `gemawi-auth`
4. Axios interceptor attaches `Bearer` token to all requests
5. Backend `protect` middleware verifies JWT on protected routes
6. 401 responses trigger automatic logout and redirect to `/login`

### Role System
Four roles with hierarchical permissions:
- `super_admin` — full system access
- `general_manager` — company-wide management
- `administrative_manager` — administrative operations
- `employee` — limited to own data

Permission checking: `usePermissions` hook (frontend), `permission.middleware.ts` (backend)

### State Management
- **Zustand stores** — no Redux; simple `create()` pattern
- Auth state persisted to `localStorage`
- Each store is a single file in `src/store/`

### API Client
- Single Axios instance in `src/services/api.ts`
- Base URL from `VITE_API_URL` env var (defaults to `http://localhost:3000/api`)
- Vite dev server proxies `/api` to `http://localhost:5000` in development
- 10-second request timeout

### Styling
- Tailwind CSS with `important: true` (override specificity issues)
- Dark mode via `class` strategy
- Arabic fonts: **Tajawal** (primary), **Outfit** (secondary)
- Custom color palette: `brand` (orange), `success`, `error`, `warning`, `blue-light`
- RTL layout throughout

### Real-time Features
- Socket.IO for chat messages, typing indicators, task comments, notifications
- Socket instance stored on `window.socket` globally
- Backend makes `io` available via `app.set('io', io)`

## Environment Variables

### Backend (`backend/.env`)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `PORT` — Server port (default: 5000)
- `NODE_ENV` — `development` or `production`
- `FRONTEND_URL` — For CORS (default: `https://gymmawy.net`)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` — SMTP config

### Frontend (`.env` or `.env.production`)
- `VITE_API_URL` — Backend API base URL
- `VITE_SOCKET_URL` — Socket.IO server URL

## Important Notes

- **Arabic comments** are common throughout the codebase — this is intentional
- The frontend has **no test framework** configured; only backend has Jest
- The `debug.controller.ts` endpoints are development-only and should not be used in production
- MongoDB models use Mongoose with `.toObject()` for serialization
- File uploads handled via Multer middleware
- The project uses ESM (`"type": "module"`) for the frontend package but CommonJS for the backend
- TypeScript strict mode is enabled in both frontend and backend
