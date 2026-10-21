"""
Test different Supabase connection configurations to find the right one.
"""
import os
import sys

# Load .env
def load_env():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), value)

load_env()

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    print("psycopg not installed. Run: pip install psycopg[binary]")
    sys.exit(1)

project_ref = "kpdjluoggujfxjxosgfw"
password = os.environ.get("DB_PASSWORD", "Hostel@123!#")

configs = [
    # Session pooler ap-south-1
    {"host": "aws-0-ap-south-1.pooler.supabase.com", "port": 6543, "user": f"postgres.{project_ref}", "dbname": "postgres"},
    # Transaction pooler ap-south-1
    {"host": "aws-0-ap-south-1.pooler.supabase.com", "port": 5432, "user": f"postgres.{project_ref}", "dbname": "postgres"},
    # Direct connection via db subdomain
    {"host": f"db.{project_ref}.supabase.co", "port": 5432, "user": "postgres", "dbname": "postgres"},
    # Direct via project URL
    {"host": f"{project_ref}.supabase.co", "port": 5432, "user": "postgres", "dbname": "postgres"},
]

success = False
for cfg in configs:
    label = f"{cfg['host']}:{cfg['port']} user={cfg['user']}"
    try:
        conn = psycopg.connect(
            host=cfg["host"],
            port=cfg["port"],
            dbname=cfg["dbname"],
            user=cfg["user"],
            password=password,
            sslmode="require",
            connect_timeout=10,
            row_factory=dict_row,
        )
        count = conn.execute("SELECT COUNT(*) AS n FROM users WHERE role='student'").fetchone()["n"]
        print("SUCCESS: " + label)
        print("   Students in DB: " + str(count))
        conn.close()
        success = True
        # Print the working config
        print("\n--- Working .env config ---")
        print("DB_HOST=" + cfg["host"])
        print("DB_PORT=" + str(cfg["port"]))
        print("DB_NAME=" + cfg["dbname"])
        print("DB_USER=" + cfg["user"])
        break
    except Exception as e:
        print("FAILED:  " + label)
        err_str = str(e).replace('\n', ' ')[:250]
        print("   Error: " + err_str)

if not success:
    print("\nAll connection attempts failed.")
