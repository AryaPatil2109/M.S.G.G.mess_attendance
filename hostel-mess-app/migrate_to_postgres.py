"""
One-time move: copy everything from the old SQLite file (hostel.db) into PostgreSQL / Supabase.

    1. Fill in the .env file with the Supabase connection details (see .env.example)
    2. Stop the app (Ctrl+C)
    3. python migrate_to_postgres.py           # copies students, logins, meals, history, settings
       python migrate_to_postgres.py --force   # same, even if PostgreSQL already has students

Your hostel.db file is not changed, so it stays as an extra backup.
"""
import os
import sys

import backup
import db as database

if not database.USE_POSTGRES:
    raise SystemExit("PostgreSQL is not configured. Create the .env file first (copy .env.example to .env).")
if not os.path.exists(database.SQLITE_PATH):
    raise SystemExit(f"Nothing to copy: {database.SQLITE_PATH} was not found.")

print("From :", database.SQLITE_PATH)
print("To   :", database.describe())

data = backup.read_backup_file(database.SQLITE_PATH)
conn = database.connect()
try:
    database.create_schema(conn)
    existing = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
    if existing and "--force" not in sys.argv:
        raise SystemExit(
            f"PostgreSQL already has {existing} users. Nothing was changed.\n"
            "To replace them with the data from hostel.db run:  python migrate_to_postgres.py --force")
    database.load(conn, data)
    print("\nCopied:")
    for t in database.TABLES:
        print(f"  {t:13} {conn.execute(f'SELECT COUNT(*) AS n FROM {t}').fetchone()['n']} rows")
finally:
    conn.close()
print("\nDone. Start the app with:  python app.py")