# MessMate — Hostel Mess Attendance System

A web app for girls' hostels that automates mess meal counts. Students mark lunch and dinner and their
in/out status, the meal count updates live for the mess manager, and the rector monitors attendance
without manual roll calls.

**Frontend:** React (Vite) · **Backend:** Python (Flask JSON API) · **Database:** PostgreSQL (Supabase) · **Backup:** 30-day rolling

## Features
| Who | What they get |
|---|---|
| **Student** | Toggle today's lunch/dinner, plan the next 7 days, “Going out / Going home / I’m back”, plan leave |
| **Rector** | Live dashboard (who is in/out/home, today’s counts), student search, add/deactivate students, history chart, cut-off times, backups |
| **Mess** | Kitchen display board with big live counts, auto-refresh, full-screen mode for a TV, CSV export |

### Counting rules
- A student is counted unless she **skipped** that meal or is **on leave** (planned leave or “Going home”).
- “Going out for the day” (college, market) does **not** cancel meals.
- At each meal’s **cut-off time** (default: lunch 10:30, dinner 17:00) the meal is locked and the
  **final count is frozen** for the mess. Times are editable on the *Cut-off times* page.

## Project structure
```
app.py              Flask backend: JSON API under /api, serves the built React app
backup.py           30-day rolling backup, list, restore
reset_logins.py     Fixes login problems / resets demo passwords
requirements.txt    Python packages
frontend/           React app (Vite)
  src/pages/        Login, Student, RectorDashboard, Students, Mess, History, Settings, Backups, Account
  src/components/   Layout (sidebar + top bar), BarChart
  src/ui.jsx        Buttons, cards, pills, modal, toasts, hooks
  src/styles.css    Design system
```

## Requirements
- Python 3.10+
- Node.js 18+ (LTS) — https://nodejs.org

## Run it

### One-time setup
```bash
pip install -r requirements.txt
cd frontend
npm install
cd ..
```

### Option A — Development (while making changes)
Two terminals:
```bash
# terminal 1 (project folder)
python app.py

# terminal 2
cd frontend
npm run dev
```
Open **http://localhost:5173**. Changes to React files show up instantly.

### Option B — Normal use / demo (one terminal)
```bash
cd frontend
npm run build
cd ..
python app.py
```
Open **http://localhost:5000**. Phones on the same Wi-Fi: `http://<laptop-IP>:5000`.

Demo accounts (created on first run):
- Rector: `rector` / `rector123`
- Mess: `mess` / `mess123`
- Students: `s101` … `s110` / `pass123` (biometric IDs `FP101` … `FP110`)

## Database: PostgreSQL on Supabase
The app uses PostgreSQL when the connection details are in a `.env` file, and falls back to the local
SQLite file `hostel.db` when there is no `.env` (useful for testing offline).

1. Copy `.env.example` to `.env` and fill in the values from Supabase
   (project → **Connect** → **Session pooler** → **View parameters**).
2. `pip install -r requirements.txt`
3. `python check_db.py` — confirms the connection and lists the tables.
4. `python migrate_to_postgres.py` — one-time copy of the old `hostel.db` data into PostgreSQL.
5. `python app.py`

`.env` contains the database password and is **never uploaded to GitHub** (see `.gitignore`).
On PostgreSQL the hourly backups are saved as `backups/hostel_YYYY-MM-DD.json`.

## Real student data
The real student list lives in `students.csv` (username, name, room, admission_date, biometric_id).
This file is **not uploaded to GitHub** (see `.gitignore`); `students.sample.csv` shows the format.
```bash
python import_students.py                  # add / update students from students.csv
python import_students.py --remove-others  # also remove students not in the file (clears demo students)
```
On a brand-new database, the app loads `students.csv` automatically on first run.

## Backup (1-month constraint)
- Automatic backup **every hour** into `backups/hostel_YYYY-MM-DD.db`; files older than **30 days** are deleted.
- Rector can click **Back up now** and download backups from the *Backups* page.
```bash
python backup.py list
python backup.py backup
python backup.py restore 2026-09-20    # stop the backend first
```

## API (for a biometric / RFID gate device)
```
POST /api/gate
X-API-Key: <GATE_API_KEY>
{"id": "FP101"}                      # toggles in/out
{"id": "FP101", "action": "HOME"}    # or IN / OUT_DAY / HOME
```

## Environment variables (optional)
| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | dev value | Session security — **set your own** |
| `GATE_API_KEY` | `change-this-gate-key` | Key the gate device must send |
| `BACKUP_DIR` | `./backups` | Backup folder |
| `BACKUP_KEEP_DAYS` | `30` | Backup retention |
| `PORT` | `5000` | Backend port |