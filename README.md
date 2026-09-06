# 🗄️ SQLProctor — Proctored SQL Exam Platform

> Admin + student platform for proctored SQLBolt exams. Admins configure multiple exams, view leaderboards and analytics; students enter name and roll number, complete exercises under proctoring, and receive a submission confirmation only.

**Live Demo:** [sql-test-six.vercel.app](https://sql-test-six.vercel.app)

> **Platform setup:** See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for Supabase migration, env vars, and admin onboarding.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started (Local)](#-getting-started-local)
- [Configuration](#-configuration)
- [How the Exam Works](#-how-the-exam-works)
- [Grading & Scoring](#-grading--scoring)
- [Proctoring & Anti-Cheat](#-proctoring--anti-cheat)
- [Email Reporting](#-email-reporting)
- [Deployment to Vercel](#-deploying-to-vercel)
- [How the Proxy Works](#-how-the-proxy-works)
- [Customising Lessons](#-customising-lessons)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🔍 Overview

SQLProctor embeds the real [SQLBolt](https://sqlbolt.com) interactive lesson environment inside a controlled, proctored shell. Students enter their name and ID, select a curriculum preset and exam duration, then work through SQL exercises under a live countdown timer.

When the exam ends — whether the student submits manually, runs out of time, or triggers the anti-cheat limit — a detailed report (score, grade, per-lesson SQL code, violation log, time taken) is automatically emailed to the instructor via [FormSubmit](https://formsubmit.co). No server or database needed.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧪 **SQLBolt Integration** | Embeds the real SQLBolt interactive workspace via a reverse proxy so task completion is detected natively |
| 📡 **Offline Fallback** | If SQLBolt is unreachable, an in-browser AlaSQL engine grades student queries against reference solutions |
| ⏱️ **Countdown Timer** | Configurable timer (15 min, 30 min, 45 min, 60 min, or unlimited); auto-submits when it reaches zero |
| 🔒 **Proctoring Engine** | Detects tab switches, window minimization, and focus loss to external apps |
| 🛡️ **Fullscreen Lock** | Optional enforced fullscreen mode with exit detection |
| 📧 **Email Reporting** | Automatic full exam report emailed to instructor on every submission |
| 🎓 **Grade Calculation** | Scores 6 letter grades (A+ to F) with violation penalty applied |
| 📜 **Submission History** | Browser-side history of the last 25 exam attempts |
| 🎵 **Audio Alerts** | Sound feedback for violations, warnings, and auto-submissions |
| 📱 **Responsive** | Works on desktop and tablet screens |

---

## 📁 Project Structure

```
sql-test/
├── api/
│   └── sqlbolt.js          # Vercel Serverless Function: reverse proxy for sqlbolt.com
├── public/                 # Static assets
├── server/
│   └── index.js            # Local Express dev server (mirrors Vercel proxy behaviour)
├── src/
│   ├── components/
│   │   ├── BoltShell.js        # Shared card/layout shell component
│   │   ├── Icons.js            # SVG icon library
│   │   ├── IframeViewer.js     # SQLBolt iframe wrapper
│   │   ├── LessonMenu.js       # Lesson picker dropdown
│   │   ├── NativeSqlBoltView.js# Offline AlaSQL workspace UI
│   │   ├── Navbar.js           # Top navigation bar with timer
│   │   ├── Sidebar.js          # Lesson progress sidebar
│   │   ├── SubmitConfirmModal.js # Submit confirmation dialog
│   │   └── ViolationModal.js   # Anti-cheat violation warning overlay
│   ├── data/
│   │   ├── db.js               # AlaSQL database seed & query runner
│   │   └── lessons.js          # All 18 lesson definitions (metadata, tasks, solutions)
│   ├── pages/
│   │   ├── EntryPage.js        # Exam setup form (name, ID, preset, settings)
│   │   ├── TestPage.js         # Main exam workspace page
│   │   └── ResultsPage.js      # Post-submission results & analytics page
│   ├── services/
│   │   ├── grader.js           # Offline SQL grading engine (AlaSQL-based)
│   │   ├── proctor.js          # Anti-cheat / proctoring event listeners
│   │   ├── sound.js            # Audio feedback service
│   │   ├── sqlboltBridge.js    # Reads SQLBolt iframe DOM to detect task completion
│   │   ├── state.js            # Central state store + exam lifecycle + email dispatch
│   │   └── timer.js            # Countdown timer service
│   ├── main.js                 # App entry point & client-side router
│   └── style.css               # Global styles (Tailwind + custom tokens)
├── index.html                  # HTML shell
├── vite.config.js              # Vite build config
├── vercel.json                 # Vercel deployment & proxy rewrites
├── tailwind.config.js
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Build Tool** | [Vite 5](https://vitejs.dev) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **In-browser SQL** | [AlaSQL](https://github.com/AlaSQL/alasql) |
| **Local Dev Server** | [Express 5](https://expressjs.com) |
| **Deployment** | [Vercel](https://vercel.com) (Serverless Functions + CDN) |
| **Email** | [FormSubmit](https://formsubmit.co) (no-backend email API) |
| **Fonts** | [Ruda](https://fonts.google.com/specimen/Ruda) via Google Fonts |

---

## 🚀 Getting Started (Local)

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- Git

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/sql-test.git
cd sql-test
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**.

> **Why Express locally?**
> The local dev server (`server/index.js`) acts as a reverse proxy for `sqlbolt.com`, the same way the Vercel Serverless Function (`api/sqlbolt.js`) does in production. This lets the embedded SQLBolt iframe work same-origin, which is required for task-completion detection. Always run `npm run dev` — not `npx vite` directly.

### 4. Open the app

Navigate to `http://localhost:3000` in your browser. You should see the **Proctored SQL Exam** entry form.

---

## ⚙️ Configuration

### Changing the recipient email

> **Deprecated.** Scores are now stored in Supabase and viewed in the admin dashboard. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

### Changing exam defaults

Exam settings (lessons, duration, proctor mode) are configured per exam in the **admin portal** at `/admin/exams`.

### Adding or editing lessons

All 18 lessons are defined in `src/data/lessons.js`. Each lesson has the following shape:

```js
{
  id: 1,
  slug: 'select_queries_introduction',   // Maps to sqlbolt.com URL
  title: 'SQL Lesson 1: SELECT queries 101',
  shortTitle: '1. SELECT 101',
  category: LESSON_CATEGORIES.BASICS,
  table: 'Movies',
  difficulty: 'Easy',
  points: 10,                            // Points awarded for full completion
  concept: '...',                        // Concept explanation shown in offline mode
  syntax: '...',                         // Syntax reference shown in offline mode
  defaultQuery: 'SELECT * FROM movies;', // Pre-filled query in offline mode
  hint: '...',                           // Hint text
  tasks: [
    { prompt: 'Find the title of each film', solution: 'SELECT title FROM movies;' },
    // ...
  ],
}
```

---

## 📖 How the Exam Works

```
Student arrives at the app
        |
        v
  +--------------------------+
  |       Entry Page         |
  |  Enter name & student ID |
  |  Choose curriculum preset|
  |  Set timer & proctor mode|
  |  Optional: fullscreen    |
  +-----------+--------------+
              | Click "Start Exam"
              v
  +--------------------------+
  |       Test Page          |
  |  SQLBolt iframe loads    |
  |  Timer counts down       |
  |  Sidebar tracks progress |
  |  Proctor watches events  |
  +-----------+--------------+
              | Submit (manual / timer / violation)
              v
  +--------------------------+
  |      Results Page        |
  |  Score & grade displayed |
  |  Per-lesson breakdown    |
  |  Violation log shown     |
  |  Email sent to instructor|
  +--------------------------+
```

### Curriculum Presets

Three presets are available from the entry form:

| Preset | Lessons Included | Focus |
|---|---|---|
| **Full Exam** | All 18 lessons | Complete SQLBolt curriculum |
| **Core SQL** | Lessons 1–12 | SELECT, WHERE, JOINs, aggregates |
| **DML / DDL** | Lessons 13–18 | INSERT, UPDATE, DELETE, CREATE, ALTER, DROP |

---

## 🎓 Grading & Scoring

### Points

Each lesson awards points on full completion (all tasks solved). Points per lesson are defined in `lessons.js` (default: **10 points** per lesson).

### Grade Scale

Violations apply a **-5% penalty** per infraction to the adjusted score:

| Adjusted Score | Grade |
|---|---|
| >= 95% | **A+ Exceptional** |
| >= 85% | **A Excellent** |
| >= 75% | **B Proficient** |
| >= 60% | **C Competent** |
| >= 40% | **D Needs Practice** |
| < 40% | **F Incomplete** |

### Offline Grading (AlaSQL)

When SQLBolt is unreachable, the offline workspace runs the student's SQL against an in-browser AlaSQL database and compares results to a reference solution:

- **Unordered results:** row sets are compared regardless of order (unless the task requires `ORDER BY`).
- **DML tasks (lessons 13–15):** a `verify` query is run after the student's statement to check the resulting data.
- **DDL tasks (lessons 16–18):** column names are compared exactly (`compareColumns: true`).

---

## 🔒 Proctoring & Anti-Cheat

The proctoring engine (`src/services/proctor.js`) monitors three categories of suspicious behaviour:

| Event | Detection Method |
|---|---|
| **Tab Switch** | `document.visibilitychange` fires when the tab is hidden |
| **Window Blur** | `window.blur` fires when focus moves to another app |
| **Fullscreen Exit** | `document.fullscreenchange` fires if the student exits fullscreen |

**Iframe-aware:** clicking inside the embedded SQLBolt iframe triggers a `window.blur` event. The proctor checks `document.activeElement` to distinguish legitimate iframe interaction from a genuine focus loss, so students are **not** falsely penalised for clicking in the exercise area.

### Proctor Modes

| Mode | Behaviour |
|---|---|
| `strike_1` | One warning allowed. Second violation auto-submits the exam. |
| `strict` | Zero tolerance. First violation immediately auto-submits. |

---

## 📧 Scores & reporting

Exam results are persisted to **Supabase** when a student submits. Admins view scores, lesson breakdowns, and violation logs in the admin portal (`/admin`). Students only see a submission confirmation screen.

The previous FormSubmit email integration has been removed in favour of the admin dashboard.

---

## 🚢 Deploying to Vercel

### First-time setup

1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo.
3. Vercel auto-detects Vite; no extra configuration is needed.
4. Click **Deploy**.

The `vercel.json` rewrites handle the SQLBolt proxy automatically:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/lesson/:path*", "destination": "/api/sqlbolt?upstream=lesson/:path*" },
    { "source": "/topic/:path*",  "destination": "/api/sqlbolt?upstream=topic/:path*" },
    { "source": "/cs/:path*",     "destination": "/api/sqlbolt?upstream=cs/:path*" }
  ]
}
```

### Subsequent deploys

```bash
git add .
git commit -m "your message"
git push
```

Vercel automatically redeploys on every push to `main`.

---

## 🔀 How the Proxy Works

SQLBolt sends `X-Frame-Options: SAMEORIGIN`, which prevents embedding it in an iframe from a different origin. SQLProctor solves this with a **reverse proxy**:

- **Locally:** `server/index.js` (Express) proxies `/lesson/*`, `/topic/*`, `/cs/*` to `https://sqlbolt.com` and strips the blocking headers.
- **On Vercel:** `api/sqlbolt.js` (Serverless Function) does the same via Vercel's rewrite rules.

Because the iframe is served from the same origin as the app, `sqlboltBridge.js` can read the iframe's DOM to detect when a student completes a task.

The proxy is locked to only allow SQLBolt's own lesson, topic, and asset paths — it cannot be used as an open proxy.

---

## 🧩 Customising Lessons

To add a new lesson or modify an existing one, edit `src/data/lessons.js`:

1. Add a new object to the `LESSONS` array with a unique `id`.
2. Set `slug` to the path segment used by SQLBolt (e.g., `select_queries_introduction`).
3. Add `tasks` with `prompt` and `solution` SQL strings.
4. Add the lesson to a preset in `TEST_PRESETS` (also in `lessons.js`).

The offline AlaSQL grader automatically uses your `solution` strings as reference answers — no expected result sets need to be maintained manually.

---

## 🛠️ Troubleshooting

### FormSubmit "Not a valid link" on activation

This happens because Gmail groups multiple activation emails in the same thread, and clicking the button in an older email uses an expired token.

**Fix:**
1. Delete or archive all old FormSubmit activation emails.
2. Submit a fresh exam from your live URL to trigger a new single activation email.
3. Open that email immediately and click **Activate Form**, or right-click the button → **Copy Link Address** and paste it into a new browser tab.

**Alternative (no activation needed):** Use the FormSubmit hash token directly:
```js
const RECIPIENT_EMAIL = 'your-hash-token'; // from the activation email
```

---

### SQLBolt iframe shows a blank page locally

Make sure you're running `npm run dev` (which starts the Express proxy server), **not** `npx vite` directly. The Vite-only dev server does not include the SQLBolt reverse proxy, so the iframe has no same-origin content to load.

---

### AlaSQL grading gives unexpected results

- Ensure your `solution` SQL in `lessons.js` runs correctly against the seeded schema in `src/data/db.js`.
- For DML lessons, add a `verify` field pointing to a SELECT that reads back the changed data.
- For DDL lessons, set `compareColumns: true` on the task to enforce column name matching.

---

### Port conflict on local startup

The Express server defaults to port `3000`. If that port is in use, set the `PORT` environment variable:

```bash
PORT=4000 npm run dev
```

---

## 🤝 Contributing

1. Fork the repository and create a feature branch.
2. Make your changes, following the existing code style.
3. Test locally with `npm run dev`.
4. Open a pull request with a clear description of the change.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

*Built with love for SQL education.*
