"""
Fix login problems: shows which accounts exist and resets the demo passwords.
Run from the project folder:   python reset_logins.py
"""
import app as A
from werkzeug.security import generate_password_hash

conn = A.connect()
print("Database:", A.database.describe())
users = conn.execute("SELECT id, username, role, active FROM users ORDER BY role, username").fetchall()
if not users:
    print("No users found - creating demo accounts...")
    A.seed(conn)
else:
    for u in users:
        pw = {"rector": "rector123", "mess": "mess123"}.get(u["role"], "pass123")
        conn.execute("UPDATE users SET username=lower(trim(username)), password_hash=?, active=1 WHERE id=?",
                     (generate_password_hash(pw), u["id"]))
conn.commit()
print("\nAccounts you can log in with now:")
for u in conn.execute("SELECT username, role FROM users ORDER BY role, username"):
    pw = {"rector": "rector123", "mess": "mess123"}.get(u["role"], "pass123")
    print(f"  {u['role']:8} {u['username']:12} {pw}")
conn.close()