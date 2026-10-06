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
import json
import os
import re
import shutil
import sqlite3
from datetime import date, datetime, timedelta

import db as database

NAME_RE = re.compile(r"hostel_(\d{4}-\d{2}-\d{2})\.(db|json)")


def make_backup(backup_dir, keep_days=30):
    os.makedirs(backup_dir, exist_ok=True)
    ext = "json" if database.USE_POSTGRES else "db"
    dest = os.path.join(backup_dir, f"hostel_{date.today().isoformat()}.{ext}")
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
    prune(backup_dir, keep_days)
    return dest


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
        if NAME_RE.fullmatch(name):
            p = os.path.join(backup_dir, name)
            out.append({"name": name,
                        "size_kb": round(os.path.getsize(p) / 1024, 1),
                        "modified": datetime.fromtimestamp(os.path.getmtime(p)).strftime("%Y-%m-%d %H:%M")})
    return out


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