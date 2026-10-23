import os, psycopg

for line in open('.env'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip())

HOST = 'aws-0-ap-south-1.pooler.supabase.com'
PORT = 6543
DB   = 'postgres'
PWD  = os.environ.get('DB_PASSWORD', '')
REF  = 'kpdjluoggujfxjxosgfw'

print("Testing Supabase pooler:", HOST, "port", PORT)
print()

for user in [f'postgres.{REF}', f'postgres@{REF}', 'postgres', REF]:
    try:
        c = psycopg.connect(host=HOST, port=PORT, dbname=DB, user=user, password=PWD,
                            sslmode='require', connect_timeout=10)
        c.close()
        print(f"[SUCCESS] user={user}")
        break
    except Exception as e:
        print(f"[FAIL]    user={user!r:42} -> {str(e).splitlines()[0][:90]}")

print()
print("Testing direct host (db.xxx.supabase.co port 5432):")
try:
    c = psycopg.connect(host=f'db.{REF}.supabase.co', port=5432, dbname=DB,
                        user='postgres', password=PWD,
                        sslmode='require', connect_timeout=25)
    c.close()
    print("[SUCCESS] Direct connection works!")
except Exception as e:
    print(f"[FAIL] {str(e).splitlines()[0][:100]}")
