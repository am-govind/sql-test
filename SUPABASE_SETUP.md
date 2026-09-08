# SQLBolt Platform Setup

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations in order via the SQL Editor:
   - [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
   - [`supabase/migrations/002_students_enrollment.sql`](supabase/migrations/002_students_enrollment.sql)
3. Create an admin user: **Authentication → Users → Add user**.
4. Copy Project URL, anon key, and service_role key from **Settings → API**.

## 2. Environment variables

```bash
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — browser (admin portal)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — server API
- `STUDENT_JWT_SECRET` — long random string for student session tokens

Add the same values on Vercel.

## 3. Local development

```bash
npm install
npm run dev
```

- **Students:** http://localhost:4000/student/login
- **Admin:** http://localhost:4000/admin/login

## 4. Workflow

### Admin

1. Sign in at `/admin/login`.
2. **Students** — add roster entries (name, roll, optional email, DOB as login password).
3. **Exams** — create exam, set status to **Active**, enroll students on the edit screen.
4. View scores on the dashboard and per-exam submissions.

### Student

1. Sign in at `/student/login` with **roll number or email** + **date of birth**.
2. Dashboard shows only enrolled active exams.
3. Take exam → submit → confirmation screen (no scores shown).

## 5. Security notes

- DOB is stored as a bcrypt hash only; admins cannot view it after creation.
- Login is rate-limited (5 attempts per 15 minutes per IP).
- Public exam listing is disabled; enrollment is required.
- Deploy on **Vercel** (not GitHub Pages) for API + SQLBolt proxy.
