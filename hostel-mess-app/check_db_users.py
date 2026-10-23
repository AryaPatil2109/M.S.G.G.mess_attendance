import sqlite3

conn = sqlite3.connect('hostel.db')
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT id, username, name, room, role, active FROM users ORDER BY role, username").fetchall()
print(f"Total users: {len(rows)}")
for r in rows:
    print(dict(r))
conn.close()
