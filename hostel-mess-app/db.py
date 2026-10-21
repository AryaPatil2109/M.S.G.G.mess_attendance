"""
Database layer.

* PostgreSQL (Supabase) is used when the connection details are in the .env file.
* Otherwise the app falls back to the local SQLite file hostel.db (handy for testing).

The rest of the app writes one style of SQL ("?" placeholders) and this module
translates it for PostgreSQL, so app.py does not care which database is behind it.
"""
import os
import queue
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ------------------------------------------------------------------ .env ---
def load_env(path=None):
    """Tiny .env reader (KEY=VALUE per line). Real environment variables win."""
    path = path or os.path.join(BASE_DIR, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ.setdefault(key.strip(), value)


load_env()

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
DB_HOST = os.environ.get("DB_HOST", "").strip()
DB_SCHEMA = os.environ.get("DB_SCHEMA", "public").strip() or "public"
USE_POSTGRES = bool(DATABASE_URL or DB_HOST)
SQLITE_PATH = os.environ.get("HOSTEL_DB", os.path.join(BASE_DIR, "hostel.db"))
if not os.access(os.path.dirname(SQLITE_PATH) or ".", os.W_OK):
    SQLITE_PATH = os.path.join("/tmp", "hostel.db")

TABLES = ["users", "presence", "gate_log", "meal_optout", "leaves", "final_counts", "settings"]
TABLES_WITH_ID = ["users", "gate_log", "leaves"]

if USE_POSTGRES:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as e:
        raise RuntimeError(
            "PostgreSQL driver (psycopg) is missing. Ensure psycopg[binary] is in requirements.txt.") from e
    IntegrityError = (sqlite3.IntegrityError, psycopg.IntegrityError)
    OperationalError = (psycopg.OperationalError, psycopg.InterfaceError)
else:
    psycopg = None
    IntegrityError = (sqlite3.IntegrityError,)
    OperationalError = (sqlite3.OperationalError,)


def describe():
    """Human readable name of the database in use (never shows the password)."""
    if not USE_POSTGRES:
        return f"SQLite file {SQLITE_PATH}"
    host = DB_HOST or DATABASE_URL.split("@")[-1].split("/")[0]
    return f"PostgreSQL at {host} (schema {DB_SCHEMA})"


# ------------------------------------------------------------ connections ---
def _pg_connect():
    opts = dict(row_factory=dict_row, connect_timeout=15, prepare_threshold=None)
    if DATABASE_URL:
        raw = psycopg.connect(DATABASE_URL, **opts)
    else:
        raw = psycopg.connect(
            host=DB_HOST,
            port=int(os.environ.get("DB_PORT", "5432")),
            dbname=os.environ.get("DB_NAME", "postgres"),
            user=os.environ.get("DB_USER", "postgres"),
            password=os.environ.get("DB_PASSWORD", ""),
            sslmode=os.environ.get("DB_SSLMODE", "require"),
            **opts)
    if DB_SCHEMA != "public":
        raw.execute(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"')
        raw.execute(f'SET search_path TO "{DB_SCHEMA}"')
        raw.commit()
    return raw


_pool = queue.LifoQueue(maxsize=5)   # re-use connections: opening one to the cloud is slow
TRACE = None                         # set to a list in tests to record every statement


class Conn:
    """Same small interface for both databases: execute / commit / rollback / close."""

    def __init__(self, raw, pg):
        self.raw = raw
        self.pg = pg
        self._used = False

    def execute(self, sql, params=()):
        if TRACE is not None:
            TRACE.append((sql, tuple(params)))
        if not self.pg:
            return self.raw.execute(sql, params)
        sql = sql.replace("?", "%s")
        try:
            cur = self.raw.execute(sql, params)
        except OperationalError:
            if self._used:
                raise
            # a pooled connection went stale while idle: reconnect once and retry
            try:
                self.raw.close()
            except Exception:
                pass
            self.raw = _pg_connect()
            cur = self.raw.execute(sql, params)
        self._used = True
        return cur

    def commit(self):
        self.raw.commit()

    def rollback(self):
        self.raw.rollback()

    def close(self):
        if not self.pg:
            self.raw.close()
            return
        try:
            self.raw.rollback()
            if self.raw.closed:
                return
            _pool.put_nowait(self.raw)
        except queue.Full:
            self.raw.close()
        except Exception:
            try:
                self.raw.close()
            except Exception:
                pass


def connect():
    if not USE_POSTGRES:
        raw = sqlite3.connect(SQLITE_PATH, timeout=10)
        raw.row_factory = sqlite3.Row
        raw.execute("PRAGMA foreign_keys=ON")
        return Conn(raw, False)
    try:
        raw = _pool.get_nowait()
        if raw.closed:
            raw = _pg_connect()
    except queue.Empty:
        raw = _pg_connect()
    return Conn(raw, True)


# ----------------------------------------------------------------- schema ---
SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
    id {PK},
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    room TEXT,
    role TEXT NOT NULL CHECK(role IN ('student','rector','mess')),
    password_hash TEXT NOT NULL,
    biometric_id TEXT UNIQUE,
    admission_date TEXT,
    active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS presence(
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'IN' CHECK(status IN ('IN','OUT_DAY','HOME')),
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS gate_log(
    id {PK},
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    source TEXT NOT NULL,
    ts TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meal_optout(
    user_id INTEGER REFERENCES users(id),
    day TEXT NOT NULL,
    meal TEXT NOT NULL,
    updated_at TEXT,
    PRIMARY KEY(user_id, day, meal)
);
CREATE TABLE IF NOT EXISTS leaves(
    id {PK},
    user_id INTEGER REFERENCES users(id),
    from_day TEXT NOT NULL,
    to_day TEXT,
    reason TEXT,
    created_at TEXT
);
CREATE TABLE IF NOT EXISTS final_counts(
    day TEXT NOT NULL,
    meal TEXT NOT NULL,
    count INTEGER NOT NULL,
    total INTEGER NOT NULL,
    frozen_at TEXT,
    PRIMARY KEY(day, meal)
);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_gate_ts ON gate_log(ts)
"""

# columns the app needs; used to detect a different table with the same name
REQUIRED = {
    "users": {"id", "username", "name", "room", "role", "password_hash", "active"},
    "presence": {"user_id", "status", "updated_at"},
    "gate_log": {"id", "user_id", "action", "source", "ts"},
    "meal_optout": {"user_id", "day", "meal"},
    "leaves": {"id", "user_id", "from_day", "to_day"},
    "final_counts": {"day", "meal", "count", "total"},
    "settings": {"key", "value"},
}


# extra columns the app uses; they are added automatically when a table was
# created earlier (or by someone else) without them
OPTIONAL = {
    "users": {"biometric_id": "TEXT", "admission_date": "TEXT"},
    "meal_optout": {"updated_at": "TEXT"},
    "leaves": {"reason": "TEXT", "created_at": "TEXT"},
    "final_counts": {"frozen_at": "TEXT"},
}


def columns(conn, table):
    if conn.pg:
        rows = conn.execute(
            "SELECT column_name AS name FROM information_schema.columns "
            "WHERE table_schema=? AND table_name=?", (DB_SCHEMA, table))
    else:
        rows = conn.execute(f"PRAGMA table_info({table})")
    return {r["name"] for r in rows}


def create_schema(conn):
    """Creates the tables if they are missing and upgrades older ones."""
    for table, needed in REQUIRED.items():
        have = columns(conn, table)
        if have and not needed <= have:
            raise SystemExit(
                f"\nThe database already has a table called '{table}' with different columns "
                f"(missing: {', '.join(sorted(needed - have))}).\n"
                "It was probably created by someone else. Either remove that table, or keep it and give\n"
                "MessMate its own space by adding this line to .env:\n\n    DB_SCHEMA=messmate\n")
    pk = "INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY" if conn.pg else "INTEGER PRIMARY KEY"
    for stmt in SCHEMA.replace("{PK}", pk).split(";"):
        if stmt.strip():
            conn.execute(stmt)
    for table, extra in OPTIONAL.items():
        have = columns(conn, table)
        for col, kind in extra.items():
            if col not in have:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {kind}")
                print(f"  database upgraded: added column {table}.{col}")
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_biometric ON users(biometric_id)")
    if conn.pg:
        # Supabase publishes tables of the public schema through its web API.
        # Row level security (with no policies) keeps them private; the app itself
        # connects as the database owner and is not affected.
        for t in TABLES:
            conn.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
    conn.commit()


# ------------------------------------------------------- dump / load data ---
def dump(conn):
    """All rows of all tables as plain dictionaries (used for backups and migration)."""
    return {t: [dict(r) for r in conn.execute(f"SELECT * FROM {t}")] for t in TABLES}


def load(conn, data):
    """Replaces everything in the database with the rows in `data` (from dump())."""
    for t in reversed(TABLES):
        conn.execute(f"DELETE FROM {t}")
    for t in TABLES:
        allowed = columns(conn, t)
        for row in data.get(t, []):
            cols = [c for c in row if c in allowed]
            conn.execute(
                f"INSERT INTO {t}({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                [row[c] for c in cols])
    if conn.pg:
        # continue the automatic id numbers after the highest imported id
        for t in TABLES_WITH_ID:
            conn.execute(
                f"SELECT setval(pg_get_serial_sequence('{t}','id'), "
                f"COALESCE((SELECT MAX(id) FROM {t}), 0) + 1, false)")
    conn.commit()