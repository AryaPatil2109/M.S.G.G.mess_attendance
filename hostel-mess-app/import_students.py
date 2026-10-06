"""
Load the real student list (students.csv) into the database.

    python import_students.py                  # add new students / update existing ones
    python import_students.py --remove-others  # also remove students that are NOT in the file
                                               # (use this once to clear the demo students)

* A backup of the database is taken first.
* New students get the password  pass123  (they can change it after login).
* Existing students keep their password; their name, room and admission date are updated.
* Stop the app (Ctrl+C) before running this.
"""
import sys

import app as A
import backup

rows = A.read_students_csv()
if not rows:
    raise SystemExit(f"No students found. Put your list in: {A.STUDENTS_CSV}")

print("Database:", A.database.describe())
print("Backup saved:", backup.make_backup(A.BACKUP_DIR, A.BACKUP_KEEP_DAYS))
conn = A.connect()
added = updated = removed = 0

for r in rows:
    u = conn.execute("SELECT id, role FROM users WHERE username=?", (r["username"],)).fetchone()
    if u and u["role"] != "student":
        print(f"  skipped {r['username']}: that username belongs to the {u['role']}")
        continue
    if u:
        conn.execute("UPDATE users SET name=?, room=?, admission_date=?, biometric_id=?, active=1 WHERE id=?",
                     (r["name"], r.get("room"), r.get("admission_date") or None,
                      r.get("biometric_id") or None, u["id"]))
        updated += 1
    else:
        A.add_user(conn, r["username"], r["name"], r.get("room"), "student", "pass123",
                   biometric_id=r.get("biometric_id") or None,
                   admission_date=r.get("admission_date") or None)
        added += 1

if "--remove-others" in sys.argv:
    keep = {r["username"] for r in rows}
    for u in conn.execute("SELECT id, username FROM users WHERE role='student'").fetchall():
        if u["username"] in keep:
            continue
        for table in ("presence", "gate_log", "meal_optout", "leaves"):
            conn.execute(f"DELETE FROM {table} WHERE user_id=?", (u["id"],))
        conn.execute("DELETE FROM users WHERE id=?", (u["id"],))
        removed += 1

conn.commit()
total = conn.execute("SELECT COUNT(*) AS n FROM users WHERE role='student' AND active=1").fetchone()["n"]
conn.close()
print(f"Done: {added} added, {updated} updated, {removed} removed. Active students now: {total}")