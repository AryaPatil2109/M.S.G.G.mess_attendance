"""
Reset the local SQLite database:
  - Keeps rector and mess accounts
  - Removes all old/demo student accounts and their related rows
  - Imports all 29 real students from students.csv
  - Sets default password 'pass123' for every student
"""
import csv, os, sqlite3
from werkzeug.security import generate_password_hash
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "hostel.db")
CSV_PATH = os.path.join(BASE_DIR, "students.csv")

def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def read_csv():
    students = []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            r = {(k or "").strip().lower(): (v or "").strip() for k, v in r.items()}
            if r.get("username") and r.get("name"):
                r["username"] = r["username"].lower()
                students.append(r)
    return students

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys=OFF")   # allow cascaded deletes manually

# --- 1. Find and remove all old student rows ---------------------------------
old_ids = [r["id"] for r in conn.execute(
    "SELECT id FROM users WHERE role='student'").fetchall()]

if old_ids:
    placeholders = ",".join("?" * len(old_ids))
    conn.execute(f"DELETE FROM presence      WHERE user_id IN ({placeholders})", old_ids)
    conn.execute(f"DELETE FROM meal_optout   WHERE user_id IN ({placeholders})", old_ids)
    conn.execute(f"DELETE FROM gate_log      WHERE user_id IN ({placeholders})", old_ids)
    conn.execute(f"DELETE FROM leaves        WHERE user_id IN ({placeholders})", old_ids)
    conn.execute(f"DELETE FROM users         WHERE id      IN ({placeholders})", old_ids)
    print(f"  Removed {len(old_ids)} old student record(s).")

# --- 2. Insert real students from CSV ----------------------------------------
students = read_csv()
added = 0
skipped = 0
for s in students:
    username       = s["username"]
    name           = s["name"]
    room           = s.get("room") or None
    admission_date = s.get("admission_date") or None
    biometric_id   = s.get("biometric_id") or None

    # skip if username already exists (rector / mess safety net)
    existing = conn.execute(
        "SELECT id FROM users WHERE username=?", (username,)).fetchone()
    if existing:
        print(f"  Skipping {username} — already exists.")
        skipped += 1
        continue

    cur = conn.execute(
        "INSERT INTO users(username,name,room,role,password_hash,biometric_id,admission_date,active) "
        "VALUES(?,?,?,?,?,?,?,1) ",
        (username, name, room, "student",
         generate_password_hash("pass123"),
         biometric_id, admission_date))
    uid = cur.lastrowid
    conn.execute(
        "INSERT INTO presence(user_id,status,updated_at) VALUES(?,?,?)",
        (uid, "IN", now_str()))
    added += 1

conn.execute("PRAGMA foreign_keys=ON")
conn.commit()
conn.close()

print(f"\n  Done! Added {added} student(s), skipped {skipped}.")
print(f"  Default password for all students: pass123")
