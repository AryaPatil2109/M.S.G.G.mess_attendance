"""
Backup module - keeps a rolling 1-month (30 day) backup of the database.

* One file per day in the backups folder (refreshed every hour by app.py).
    - PostgreSQL / Supabase : hostel_YYYY-MM-DD.json  (all tables, readable text)
    - SQLite                : hostel_YYYY-MM-DD.db    (copy of the database file)
* Files older than 30 days are deleted automatically.

Command line:
    python backup.py backup               # take a backup now
    python backup.py list                 # show available backups
    python backup.py restore 2026-09-20   # restore that day's backup (stop the app first)
"""
import argparse
import csv
import io
import json
import os
import re
import shutil
import sqlite3
from datetime import date, datetime, timedelta

import db as database

NAME_RE = re.compile(r"hostel_(?:students_30days_)?(\d{4}-\d{2}-\d{2})\.(db|json|csv)")


class BackupResult(str):
    """String representing the DB backup path, with an extra csv_dest attribute."""
    def __new__(cls, dest, csv_dest=""):
        obj = str.__new__(cls, dest)
        obj.csv_dest = csv_dest or ""
        return obj


def generate_student_30day_csv(as_of_date=None, conn=None):
    """Generates comprehensive CSV string with 30 days of attendance, meals, leaves, and gate movements for all students."""
    close_after = False
    if conn is None:
        conn = database.connect()
        close_after = True

    try:
        as_of = as_of_date or date.today()
        # 30 days window up to as_of
        days = [(as_of - timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
        since = days[0]
        end_day = days[-1]

        students = conn.execute(
            """SELECT id, username, name, room, biometric_id, admission_date, active 
               FROM users WHERE role='student' ORDER BY username"""
        ).fetchall()

        presence = {
            r["user_id"]: (r["status"], r["updated_at"])
            for r in conn.execute("SELECT user_id, status, updated_at FROM presence").fetchall()
        }

        leaves = conn.execute(
            """SELECT user_id, from_day, to_day, reason, created_at 
               FROM leaves 
               WHERE from_day <= ? AND (to_day IS NULL OR to_day >= ?)""",
            (end_day, since)
        ).fetchall()

        leaves_by_user = {}
        for lv in leaves:
            leaves_by_user.setdefault(lv["user_id"], []).append(lv)

        optouts = conn.execute(
            "SELECT user_id, day, meal FROM meal_optout WHERE day >= ? AND day <= ?",
            (since, end_day)
        ).fetchall()
        optouts_set = {(r["user_id"], r["day"], r["meal"]) for r in optouts}

        gate_logs = conn.execute(
            "SELECT user_id, action, source, ts FROM gate_log WHERE ts >= ? AND ts <= ? ORDER BY ts",
            (since + " 00:00:00", end_day + " 23:59:59")
        ).fetchall()

        gate_by_user_day = {}
        for g in gate_logs:
            g_day = g["ts"][:10]
            g_time = g["ts"][11:19]
            gate_by_user_day.setdefault((g["user_id"], g_day), []).append(
                f"{g_time} {g['action']} ({g['source']})"
            )

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "date",
            "username",
            "name",
            "room",
            "biometric_id",
            "admission_date",
            "active_status",
            "attendance_status",
            "lunch",
            "dinner",
            "leave_reason",
            "gate_movements"
        ])

        today_str = date.today().isoformat()

        for day in days:
            is_today = (day == today_str)
            for s in students:
                uid = s["id"]
                on_leave = None
                if uid in leaves_by_user:
                    for lv in leaves_by_user[uid]:
                        if lv["from_day"] <= day and (lv["to_day"] is None or lv["to_day"] >= day):
                            on_leave = lv["reason"] or "On Leave"
                            break

                day_gates = gate_by_user_day.get((uid, day), [])
                if on_leave:
                    status = "ON_LEAVE"
                elif is_today:
                    curr_p = presence.get(uid)
                    status = curr_p[0] if curr_p else "IN"
                elif day_gates:
                    last_action = day_gates[-1].split(" ")[1]
                    status = last_action
                else:
                    status = "IN"

                away = (status in ("OUT_DAY", "HOME", "ON_LEAVE"))
                if on_leave or away:
                    lunch = "Leave/Away"
                    dinner = "Leave/Away"
                else:
                    lunch = "Opted Out" if (uid, day, "lunch") in optouts_set else "Coming"
                    dinner = "Opted Out" if (uid, day, "dinner") in optouts_set else "Coming"

                gate_str = "; ".join(day_gates) if day_gates else "-"
                leave_str = on_leave if on_leave else "-"
                active_str = "Active" if s["active"] in (1, "1", True) else "Inactive"

                writer.writerow([
                    day,
                    s["username"],
                    s["name"],
                    s["room"] or "",
                    s["biometric_id"] or "",
                    s["admission_date"] or "",
                    active_str,
                    status,
                    lunch,
                    dinner,
                    leave_str,
                    gate_str
                ])

        return buf.getvalue()
    finally:
        if close_after:
            conn.close()


def make_backup(backup_dir, keep_days=30):
    os.makedirs(backup_dir, exist_ok=True)
    today_str = date.today().isoformat()
    ext = "json" if database.USE_POSTGRES else "db"
    dest = os.path.join(backup_dir, f"hostel_{today_str}.{ext}")
    tmp = dest + ".tmp"
    if database.USE_POSTGRES:
        conn = database.connect()
        try:
            data = database.dump(conn)
        finally:
            conn.close()
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"created_at": datetime.now().isoformat(timespec="seconds"), "tables": data},
                      f, ensure_ascii=False, indent=1, default=str)
    else:
        src = sqlite3.connect(database.SQLITE_PATH)
        dst = sqlite3.connect(tmp)
        try:
            src.backup(dst)
        finally:
            dst.close()
            src.close()
    os.replace(tmp, dest)  # atomic: never leaves a half-written backup

    # Also generate the 30-day student data CSV backup
    csv_dest = os.path.join(backup_dir, f"hostel_students_30days_{today_str}.csv")
    csv_tmp = csv_dest + ".tmp"
    try:
        csv_content = generate_student_30day_csv(as_of_date=date.today())
        with open(csv_tmp, "w", encoding="utf-8-sig", newline="") as f:
            f.write(csv_content)
        os.replace(csv_tmp, csv_dest)
    except Exception as e:
        if os.path.exists(csv_tmp):
            os.remove(csv_tmp)
        print("Warning: Failed to create student CSV backup:", e)
        csv_dest = ""

    prune(backup_dir, keep_days)
    return BackupResult(dest, csv_dest)


def prune(backup_dir, keep_days=30):
    limit = date.today() - timedelta(days=keep_days)
    removed = []
    for name in os.listdir(backup_dir):
        m = NAME_RE.fullmatch(name)
        if m and date.fromisoformat(m.group(1)) < limit:
            os.remove(os.path.join(backup_dir, name))
            removed.append(name)
    return removed


def list_backups(backup_dir):
    if not os.path.isdir(backup_dir):
        return []
    out = []
    for name in sorted(os.listdir(backup_dir), reverse=True):
        m = NAME_RE.fullmatch(name)
        if m:
            p = os.path.join(backup_dir, name)
            day = m.group(1)
            ext = m.group(2)
            out.append({
                "name": name,
                "day": day,
                "type": "csv" if ext == "csv" else "database",
                "ext": ext,
                "size_kb": round(os.path.getsize(p) / 1024, 1),
                "modified": datetime.fromtimestamp(os.path.getmtime(p)).strftime("%Y-%m-%d %H:%M")
            })
    return out


def list_backups_by_day(backup_dir):
    files = list_backups(backup_dir)
    by_day = {}
    for f in files:
        d = f["day"]
        if d not in by_day:
            by_day[d] = {
                "day": d,
                "modified": f["modified"],
                "db_file": None,
                "csv_file": None,
            }
        if f["type"] == "csv":
            by_day[d]["csv_file"] = f
        else:
            by_day[d]["db_file"] = f
            by_day[d]["modified"] = f["modified"]
    return sorted(by_day.values(), key=lambda x: x["day"], reverse=True)


def read_backup_file(path):
    """Returns the rows of a backup file ({table: [rows]}), for .json and .db files."""
    if path.endswith(".json"):
        with open(path, encoding="utf-8") as f:
            return json.load(f)["tables"]
    src = sqlite3.connect(path)
    src.row_factory = sqlite3.Row
    try:
        have = {r["name"] for r in src.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        return {t: [dict(r) for r in src.execute(f"SELECT * FROM {t}")] for t in database.TABLES if t in have}
    finally:
        src.close()


def restore(backup_file, backup_dir):
    """Puts the data of a backup file back into the database in use."""
    print("Database:", database.describe())
    if database.USE_POSTGRES:
        safety = os.path.join(backup_dir, "before-restore-" + datetime.now().strftime("%Y%m%d%H%M%S") + ".json")
        conn = database.connect()
        try:
            with open(safety, "w", encoding="utf-8") as f:
                json.dump({"tables": database.dump(conn)}, f, ensure_ascii=False, default=str)
            print("Current data saved as", safety)
            database.load(conn, read_backup_file(backup_file))
        finally:
            conn.close()
    elif backup_file.endswith(".db"):
        if os.path.exists(database.SQLITE_PATH):
            safety = database.SQLITE_PATH + ".before-restore-" + datetime.now().strftime("%Y%m%d%H%M%S")
            shutil.copy2(database.SQLITE_PATH, safety)
            print("Current database saved as", safety)
        src = sqlite3.connect(backup_file)
        dst = sqlite3.connect(database.SQLITE_PATH)
        try:
            src.backup(dst)
        finally:
            dst.close()
            src.close()
    else:
        conn = database.connect()
        try:
            database.create_schema(conn)
            database.load(conn, read_backup_file(backup_file))
        finally:
            conn.close()
    print("Restored", backup_file)


if __name__ == "__main__":
    bdir = os.environ.get("BACKUP_DIR", os.path.join(database.BASE_DIR, "backups"))
    keep = int(os.environ.get("BACKUP_KEEP_DAYS", "30"))

    ap = argparse.ArgumentParser(description="Hostel mess DB backups (30-day rolling)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("backup")
    sub.add_parser("list")
    r = sub.add_parser("restore")
    r.add_argument("day", help="date of the backup, e.g. 2026-09-20")
    a = ap.parse_args()

    if a.cmd == "backup":
        print("Saved", make_backup(bdir, keep))
    elif a.cmd == "list":
        for b in list_backups(bdir):
            print(f"{b['name']}  {b['size_kb']} KB  (last updated {b['modified']})")
    else:
        found = [os.path.join(bdir, f"hostel_{a.day}.{ext}") for ext in ("json", "db")]
        found = [f for f in found if os.path.exists(f)]
        if not found:
            raise SystemExit(f"No backup for {a.day}. Run 'python backup.py list'.")
        restore(found[0], bdir)