"""
Fix frozen meal counts for today.
Deletes the stale frozen counts (set when only demo students existed)
and re-freezes them with the real student data.
"""
import sqlite3, os
from datetime import date, datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "hostel.db")

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

today = date.today().isoformat()

# --- 1. Delete stale frozen counts for today ---------------------------------
deleted = conn.execute("DELETE FROM final_counts WHERE day=?", (today,)).rowcount
print(f"Deleted {deleted} stale frozen count(s) for {today}")

# --- 2. Compute real counts --------------------------------------------------
MEALS = ["lunch", "dinner"]

# Students who are currently in the hostel (status=IN, not on leave, active)
on_leave_ids = {r["user_id"] for r in conn.execute(
    "SELECT user_id FROM leaves WHERE from_day<=? AND (to_day IS NULL OR to_day>=?)",
    (today, today))}

students = conn.execute(
    "SELECT u.id, COALESCE(p.status,'IN') AS status "
    "FROM users u LEFT JOIN presence p ON p.user_id=u.id "
    "WHERE u.role='student' AND u.active=1"
).fetchall()

total = len(students)
now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

for meal in MEALS:
    opted_out = {r["user_id"] for r in conn.execute(
        "SELECT user_id FROM meal_optout WHERE day=? AND meal=?", (today, meal))}

    coming = 0
    for s in students:
        on_leave = s["id"] in on_leave_ids
        # OUT_DAY and HOME both mean student is away and won't eat
        away     = s["status"] in ("OUT_DAY", "HOME")
        opted_no = s["id"] in opted_out
        if not on_leave and not away and not opted_no:
            coming += 1

    conn.execute(
        "INSERT INTO final_counts(day,meal,count,total,frozen_at) VALUES(?,?,?,?,?)",
        (today, meal, coming, total, now_str))
    print(f"  {meal.capitalize():8s}: {coming} coming out of {total} total  (frozen at {now_str})")

conn.commit()
conn.close()
print("\nDone! Refresh the browser to see updated counts.")
