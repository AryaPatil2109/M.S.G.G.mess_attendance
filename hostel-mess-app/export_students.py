"""
Export all students from the active database into students.csv and local hostel.db.

Usage:
    python export_students.py

Works with either Supabase/PostgreSQL (if configured in .env) or local SQLite.
Updates students.csv with the latest list of students from the database.
Also mirrors all tables to local hostel.db if PostgreSQL is in use.
"""
import csv
import os
import sqlite3
import app as A
import db as database

def export():
    conn = A.connect()
    try:
        rows = conn.execute(
            """SELECT username, name, room, admission_date, biometric_id, active 
               FROM users 
               WHERE role='student' 
               ORDER BY username"""
        ).fetchall()
        
        target = A.STUDENTS_CSV
        with open(target, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["username", "name", "room", "admission_date", "biometric_id", "active"])
            for r in rows:
                writer.writerow([
                    r["username"],
                    r["name"],
                    r["room"] or "",
                    r["admission_date"] or "",
                    r["biometric_id"] or "",
                    1 if r["active"] in (1, "1", True) else (0 if r["active"] in (0, "0", False) else 1)
                ])
        print(f"Successfully exported {len(rows)} students to: {target}")

        # If PostgreSQL is used and hostel.db exists locally, mirror database
        if database.USE_POSTGRES and os.path.exists(database.SQLITE_PATH):
            try:
                data = database.dump(conn)
                raw_sq = sqlite3.connect(database.SQLITE_PATH, timeout=10)
                raw_sq.row_factory = sqlite3.Row
                sq_conn = database.Conn(raw_sq, False)
                database.load(sq_conn, data)
                sq_conn.close()
                print(f"Successfully mirrored database to local SQLite: {database.SQLITE_PATH}")
            except Exception as e:
                print(f"Note: Could not mirror to SQLite file: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    export()
