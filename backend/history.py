"""Try-on history — persisted in Supabase."""

import json
import uuid
from datetime import datetime
from db import db_cursor


def get_or_create_session(session_id: str | None = None) -> dict:
    """Get existing session or create a new one in Supabase."""
    sid = session_id or str(uuid.uuid4())

    with db_cursor() as cur:
        cur.execute("SELECT * FROM sessions WHERE session_id = %s", (sid,))
        row = cur.fetchone()

        if row:
            return {
                "session_id": row["session_id"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "preferences": row["preferences"] or {},
                "tryon_history": _get_history(cur, sid),
                "comparisons": _get_comparisons(cur, sid),
            }

        # Create new session
        cur.execute(
            "INSERT INTO sessions (session_id, preferences) VALUES (%s, %s) RETURNING *",
            (sid, json.dumps({}))
        )
        new_row = cur.fetchone()
        return {
            "session_id": new_row["session_id"],
            "created_at": new_row["created_at"].isoformat(),
            "preferences": {},
            "tryon_history": [],
            "comparisons": [],
        }


def save_preferences(session_id: str, preferences: dict) -> dict:
    # Ensure session exists
    get_or_create_session(session_id)

    with db_cursor() as cur:
        cur.execute(
            "UPDATE sessions SET preferences = %s, updated_at = now() WHERE session_id = %s",
            (json.dumps(preferences), session_id)
        )
    return get_or_create_session(session_id)


def add_tryon_to_history(
    session_id: str,
    outfit_id: str,
    outfit_name: str,
    outfit_image: str,
    result_images: list[str],
    hairstyle: str | None = None,
    makeup: str | None = None,
) -> dict:
    get_or_create_session(session_id)

    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO tryon_history (session_id, outfit_id, outfit_name, outfit_image, result_images, hairstyle, makeup)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            session_id, outfit_id, outfit_name, outfit_image,
            json.dumps(result_images), hairstyle, makeup
        ))
        row = cur.fetchone()

    return _row_to_entry(row)


def get_history(session_id: str) -> list[dict]:
    with db_cursor() as cur:
        return _get_history(cur, session_id)


def _get_history(cur, session_id: str) -> list[dict]:
    cur.execute(
        "SELECT * FROM tryon_history WHERE session_id = %s ORDER BY created_at DESC LIMIT 50",
        (session_id,)
    )
    return [_row_to_entry(r) for r in cur.fetchall()]


def _row_to_entry(row) -> dict:
    return {
        "id": str(row["id"]),
        "timestamp": row["created_at"].isoformat() if row["created_at"] else None,
        "outfit_id": row["outfit_id"],
        "outfit_name": row["outfit_name"],
        "outfit_image": row["outfit_image"],
        "result_images": row["result_images"] or [],
        "hairstyle": row["hairstyle"],
        "makeup": row["makeup"],
    }


def add_comparison(session_id: str, tryon_ids: list[str], name: str | None = None) -> dict:
    get_or_create_session(session_id)
    comp_name = name or f"Comparison {datetime.now().strftime('%b %d')}"

    with db_cursor() as cur:
        cur.execute("""
            INSERT INTO comparisons (session_id, name, tryon_ids)
            VALUES (%s, %s, %s)
            RETURNING *
        """, (session_id, comp_name, json.dumps(tryon_ids)))
        row = cur.fetchone()

    return {
        "id": str(row["id"]),
        "timestamp": row["created_at"].isoformat(),
        "name": row["name"],
        "tryon_ids": row["tryon_ids"],
    }


def get_comparisons(session_id: str) -> list[dict]:
    with db_cursor() as cur:
        comps = _get_comparisons(cur, session_id)
        history = _get_history(cur, session_id)

    history_map = {h["id"]: h for h in history}
    for c in comps:
        c["tryons"] = [history_map[tid] for tid in c.get("tryon_ids", []) if tid in history_map]
    return comps


def _get_comparisons(cur, session_id: str) -> list[dict]:
    cur.execute(
        "SELECT * FROM comparisons WHERE session_id = %s ORDER BY created_at DESC LIMIT 20",
        (session_id,)
    )
    return [{
        "id": str(r["id"]),
        "timestamp": r["created_at"].isoformat() if r["created_at"] else None,
        "name": r["name"],
        "tryon_ids": r["tryon_ids"] or [],
    } for r in cur.fetchall()]


def delete_history_entry(session_id: str, entry_id: str) -> bool:
    with db_cursor() as cur:
        cur.execute(
            "DELETE FROM tryon_history WHERE session_id = %s AND id = %s",
            (session_id, entry_id)
        )
        return cur.rowcount > 0
