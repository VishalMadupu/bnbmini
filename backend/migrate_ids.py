"""One-time migration: renumber all records into a single continuous Universal BNB ID
(BNB-000001, BNB-000002, ...) ordered by creation time. Also sets record_type, origin
and rebuilds slugs. Idempotent-ish: safe to re-run (re-derives order from created_at)."""
import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def slugify(text):
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    return text[:80]


def build_slug(title, city, bnb_id):
    parts = [p for p in [slugify(title), slugify(city), bnb_id.lower()] if p]
    return "-".join(parts)


COLLECTIONS = [
    ("jobs", "Job", "listing"),
    ("tenders", "Tender", "listing"),
    ("work_requirements", "Work Requirement", "wr"),
    ("knowledge", "Knowledge Hub", "knowledge"),
    ("resumes", "Resume", "private"),
    ("vendors", "Vendor", "private"),
]


def origin_for(doc):
    if doc.get("origin"):
        return doc["origin"]
    if doc.get("source_type") == "BNB Research":
        return "BNB Created"
    return "Public Submission"


def main():
    records = []
    for coll, rtype, kind in COLLECTIONS:
        for d in db[coll].find({}):
            records.append((d.get("created_at") or d.get("posted_date") or "", coll, rtype, kind, d))
    records.sort(key=lambda r: r[0])

    seq = 0
    for _, coll, rtype, kind, d in records:
        seq += 1
        bnb_id = f"BNB-{seq:06d}"
        update = {"bnb_id": bnb_id, "record_type": rtype, "origin": origin_for(d)}
        if kind == "listing" or kind == "wr":
            title = d.get("title") or ("requirement" if kind == "wr" else "listing")
            update["slug"] = build_slug(title, d.get("city") or "", bnb_id)
        elif kind == "knowledge":
            update["slug"] = f'{slugify(d.get("title") or "article")}-{bnb_id.lower()}'
        db[coll].update_one({"_id": d["_id"]}, {"$set": update})
        print(f"{coll:20s} {d.get('title') or d.get('full_name') or d.get('company_name') or ''!s:40.40} -> {bnb_id}")

    # reset counters
    db.counters.delete_many({})
    db.counters.update_one({"_id": "bnb_universal"}, {"$set": {"seq": seq}}, upsert=True)
    print(f"\nMigrated {seq} records. Universal counter set to {seq}.")


if __name__ == "__main__":
    main()
