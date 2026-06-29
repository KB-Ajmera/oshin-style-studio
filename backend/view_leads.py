"""View captured email leads with each visitor's style profile + outfit tried.

Run:  python backend/view_leads.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from history import get_leads


def main():
    leads = get_leads()
    print(f"\n=== {len(leads)} captured leads ===\n")
    if not leads:
        print("No leads yet. They appear here once visitors enter their email after a try-on.")
        return
    for l in leads:
        p = l.get("preferences") or {}
        prof = ", ".join(
            str(p[k]) for k in ["body_shape", "size_range", "primary_occasion"] if p.get(k)
        ) or "(no quiz)"
        when = (l["created_at"] or "")[:16].replace("T", " ")
        print(f"{l['email']}")
        print(f"   when    : {when}")
        print(f"   tried   : {l.get('outfit_name') or '-'}")
        print(f"   profile : {prof}")
        print()


if __name__ == "__main__":
    main()
