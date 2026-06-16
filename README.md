# 🚀 TaskFlow — Role-Based Task Management App (MERN Stack)

A production-grade, full-featured task management application built with MongoDB, Express, React, and Node.js.

---

## 📋 Features

### Authentication & Security
- JWT access + refresh token rotation
- bcrypt password hashing (12 rounds)
- Email verification & password reset via nodemailer
- Rate limiting (200 req/15min global, 20 req/15min auth)
- Helmet security headers, CORS protection
- Login history tracking & audit logs

### Role-Based Access Control
| Feature | User | Admin | Super Admin |
|---|---|---|---|
| View own tasks | ✅ | ✅ | ✅ |
| Create / edit tasks | ✅ | ✅ | ✅ |
| Delete tasks | ❌ | ✅ | ✅ |
| Manage users | ❌ | ✅ | ✅ |
| Promote to admin | ❌ | ❌ | ✅ |
| Bulk user actions | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ✅ | ✅ |
| System settings | ❌ | ❌ | ✅ |

### Task Management
- Full CRUD with status, priority, assignee, team, tags, labels
- File attachments (up to 5 files, 10MB each)
- Subtasks with completion tracking & progress bar
- Comments with @mentions
- Time tracking (start/stop timer, history)
- Activity history (field-level change tracking)
- Recurring tasks (daily / weekly / monthly)
- Task dependencies
- Drag-and-drop Kanban board (5 columns)
- Calendar view by due date
- Full-text search + advanced filters
- Kanban reorder with order persistence

### Teams
- Create & manage teams
- Member roles: Leader / Member / Viewer
- Add/remove members, change roles
- Team-level task filtering
- Team analytics (per-member stats)
- Invitation system with token

### Notifications
- Real-time Socket.IO push notifications
- Email notifications via Nodemailer
- Types: task assigned, comment, mention, team invite, overdue
- Mark as read / mark all / delete all
- Unread badge in sidebar

### Analytics & Reporting
- User dashboard: stats, weekly chart, upcoming deadlines
- Admin dashboard: monthly trend, task distribution, top performers
- Super admin dashboard: user distribution, platform stats
- Productivity report with date range & user filter
- Team analytics with per-member breakdown

### Settings
- Profile: avatar upload, department, position, phone
- Account: light/dark theme toggle
- Notifications: granular email/push preferences
- Security: change password

---

## 🗂 Project Structure

```
task-management-app/
├── backend/
│   ├── controllers/        # Business logic
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   ├── userController.js
│   │   ├── teamController.js
│   │   ├── notificationController.js
│   │   ├── analyticsController.js
│   │   └── auditController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT protect + authorize
│   │   ├── upload.js        # Multer file uploads
│   │   └── auditMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Task.js          # Comments, subtasks, time entries, activity
│   │   ├── Team.js
│   │   ├── Notification.js
│   │   └── AuditLog.js
│   ├── routes/              # Express routers
│   ├── utils/
│   │   ├── jwt.js           # Token generation/verification
│   │   ├── email.js         # Nodemailer + templates
│   │   └── notification.js  # Socket.IO notification helper
│   ├── uploads/             # Uploaded files (gitignored)
│   ├── seed.js              # Demo data seeder
│   ├── server.js            # Entry point
│   ├── .env                 # Environment variables
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.js           # Routes & role guards
│   │   ├── index.css        # Design system (CSS variables, components)
│   │   ├── context/
│   │   │   ├── AuthContext.js   # Auth state + login/logout
│   │   │   └── SocketContext.js # Real-time Socket.IO
│   │   ├── utils/api.js     # Axios instance + auto refresh
│   │   └── pages/
│   │       ├── auth/        # Login, Register, ForgotPwd, Reset, Verify
│   │       ├── dashboard/   # User / Admin / SuperAdmin dashboards
│   │       ├── tasks/       # List, Detail, Create, Edit, Kanban, Calendar
│   │       ├── users/       # List, Detail, Create
│   │       ├── teams/       # List, Detail
│   │       ├── settings/    # Profile, Account, Notifications, Security
│   │       ├── analytics/   # Reports
│   │       └── admin/       # Audit Logs, System Settings
│   ├── public/index.html
│   ├── nginx.conf
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env        # Edit with your values
npm install
npm run seed                # Seed demo data
npm run dev                 # Starts on :5000

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm start                   # Starts on :3000
```

### 2. Demo Login Credentials
| Email | Password | Role |
|---|---|---|
| superadmin@demo.com | password123 | Super Admin |
| admin@demo.com | password123 | Admin |
| user@demo.com | password123 | User |
| alice@demo.com | password123 | User |
| bob@demo.com | password123 | User |

---

## 🐳 Docker (Full Stack)

```bash
# Build and run everything
docker-compose up --build

# App → http://localhost:3000
# API → http://localhost:5000
# MongoDB → localhost:27017

# Seed data inside container
docker exec taskflow_backend node seed.js
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout (invalidate refresh token) |
| POST | /api/auth/refresh-token | Get new access token |
| GET  | /api/auth/me | Get current user |
| GET  | /api/auth/verify-email?token= | Verify email |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset password |
| PUT  | /api/auth/change-password | Change password (auth required) |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/tasks | List tasks (filtered, paginated) |
| POST | /api/tasks | Create task (multipart/form-data) |
| GET | /api/tasks/kanban | Get tasks grouped by status |
| GET | /api/tasks/calendar | Get tasks by date range |
| PUT | /api/tasks/order | Bulk reorder (Kanban drag) |
| GET | /api/tasks/:id | Get single task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task (admin+) |
| POST | /api/tasks/:id/comments | Add comment |
| DELETE | /api/tasks/:id/comments/:cid | Delete comment |
| POST | /api/tasks/:id/subtasks | Add subtask |
| PUT | /api/tasks/:id/subtasks/:sid | Update subtask |
| DELETE | /api/tasks/:id/subtasks/:sid | Delete subtask |
| POST | /api/tasks/:id/time/start | Start timer |
| POST | /api/tasks/:id/time/stop | Stop timer |

### Full API continues for /users, /teams, /notifications, /analytics, /audit

---

## 🛠 Environment Variables

### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/task_management_db
JWT_SECRET=your_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
NODE_ENV=development
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 🔒 Security Notes
- Change all JWT secrets in production (min 32 chars, random)
- Use MongoDB Atlas with IP whitelist in production
- Enable HTTPS (reverse proxy with Nginx + Certbot)
- Set `NODE_ENV=production` to disable Morgan logging

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Recharts, DnD Kit, react-hot-toast |
| Backend | Node.js 18, Express 4, Socket.IO 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT (access + refresh), bcryptjs |
| File Upload | Multer (disk storage) |
| Email | Nodemailer |
| Security | Helmet, express-rate-limit, CORS |
| Deploy | Docker, Nginx |
