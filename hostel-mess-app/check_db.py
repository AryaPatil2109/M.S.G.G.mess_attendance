"""
Checks the database connection and shows what is in it.   Run:  python check_db.py
Use this first after filling in .env - it tells you clearly if the details are wrong.
"""
import db as database

print("Database:", database.describe())
try:
    conn = database.connect()
    if conn.pg:
        v = conn.execute("SELECT version() AS v").fetchone()["v"]
        print("Connected:", v.split(",")[0])
        rows = conn.execute(
            "SELECT table_schema AS s, table_name AS t FROM information_schema.tables "
            "WHERE table_type='BASE TABLE' AND table_schema IN ('public', ?) ORDER BY 1, 2", (database.DB_SCHEMA,)).fetchall()
        print(f"\nTables already in the database ({len(rows)}):")
        for r in rows:
            cols = conn.execute(
                "SELECT column_name AS c, data_type AS d FROM information_schema.columns "
                "WHERE table_schema=? AND table_name=? ORDER BY ordinal_position", (r["s"], r["t"])).fetchall()
            n = conn.execute(f'SELECT COUNT(*) AS n FROM "{r["s"]}"."{r["t"]}"').fetchone()["n"]
            print(f"  {r['s']}.{r['t']}  ({n} rows)  columns: {', '.join(c['c'] + ' ' + c['d'] for c in cols)}")
        if not rows:
            print("  (none yet - MessMate will create its tables when you start the app)")
    else:
        print("Connected (local SQLite file). To use PostgreSQL, create the .env file.")
    conn.close()
except Exception as e:  # show a readable reason instead of a long error
    print("\nCould not connect:", str(e).strip().splitlines()[0])
    print("Check DB_HOST, DB_PORT, DB_USER and DB_PASSWORD in the .env file.")