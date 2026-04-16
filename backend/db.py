"""Supabase database connection helper."""

import os
import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager


def get_conn_string() -> str:
    """Build Supabase pooler connection string from env vars."""
    password = os.getenv("SUPABASE_DB_PASSWORD")
    url = os.getenv("SUPABASE_URL", "")
    project_ref = url.replace("https://", "").replace(".supabase.co", "")
    return f"postgresql://postgres.{project_ref}:{password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"


@contextmanager
def db_cursor(dict_rows: bool = True):
    """Context manager for database operations."""
    conn_str = get_conn_string()
    conn = psycopg.connect(conn_str, autocommit=True, connect_timeout=10)
    try:
        row_factory = dict_row if dict_rows else None
        cur = conn.cursor(row_factory=row_factory)
        try:
            yield cur
        finally:
            cur.close()
    finally:
        conn.close()
