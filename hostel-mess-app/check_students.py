"""Quick check: connect to the configured database and show all students."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db as database

conn = database.connect()
rows = conn.execute(
    "SELECT id, username, name, room, active FROM users WHERE role='student' ORDER BY id"
).fetchall()
print(f"Database: {database.describe()}")
print(f"Total students in DB: {len(rows)}")
for r in rows:
    print(f"  {r['id']:3d}: {r['username']:8s} | {r['name']:30s} | room={r['room']} | active={r['active']}")
conn.close()
