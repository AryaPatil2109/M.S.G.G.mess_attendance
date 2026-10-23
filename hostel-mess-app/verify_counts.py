import sqlite3
from datetime import date
from collections import Counter

conn = sqlite3.connect('hostel.db')
conn.row_factory = sqlite3.Row
today = date.today().isoformat()

students = conn.execute(
    "SELECT u.id, u.name, COALESCE(p.status,'IN') AS status "
    "FROM users u LEFT JOIN presence p ON p.user_id=u.id "
    "WHERE u.role='student' AND u.active=1"
).fetchall()

on_leave = {r['user_id'] for r in conn.execute(
    "SELECT user_id FROM leaves WHERE from_day<=? AND (to_day IS NULL OR to_day>=?)",
    (today, today))}

print('Status breakdown:')
c = Counter()
for s in students:
    lv = s['id'] in on_leave
    c['on_leave' if lv else s['status']] += 1

for k, v in c.items():
    print(f'  {k}: {v}')
print(f'  TOTAL: {len(students)}')

print('\nfinal_counts table:')
for r in conn.execute("SELECT * FROM final_counts WHERE day=?", (today,)):
    print(dict(r))
conn.close()
