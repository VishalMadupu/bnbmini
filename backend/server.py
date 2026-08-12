from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query, Response, Request
from starlette.responses import JSONResponse, Response as StarletteResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import re
import logging
import uuid
import hmac
import jwt
import httpx
import io
from openpyxl import Workbook
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, insert, update, delete, or_, and_, text, func
import json

from db import (
    engine, async_session, metadata, init_db, dispose_db,
    counters, files, jobs, tenders, work_requirements,
    knowledge, resumes, vendors, TABLE_MAP,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------- Object Storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "bitsndbricks"
storage_key = None

# ---------------- Auth / Email / Site config ----------------
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "bitsadmin123")
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "BitsNdBricks")
ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL")
SITE_URL = (os.environ.get("SITE_URL") or "").rstrip("/")


def create_admin_token():
    payload = {"role": "admin", "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_admin_token(token: str) -> bool:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("role") == "admin"
    except jwt.PyJWTError:
        return False


async def send_submission_email(kind: str, doc: dict):
    if not EMAIL_KEY or not ADMIN_NOTIFY_EMAIL:
        return
    rows = "".join(
        f'<tr><td style="padding:4px 12px 4px 0;color:#64748b;">{k}</td>'
        f'<td style="padding:4px 0;color:#0f172a;">{v or "—"}</td></tr>'
        for k, v in [
            ("Type", kind.title()), ("BNB ID", doc.get("bnb_id")),
            ("Title", doc.get("title")), ("Organization", doc.get("organization")),
            ("Location", f'{doc.get("city", "")}, {doc.get("state", "")}'),
            ("Submitter", doc.get("submitter_name")),
            ("Submitter contact", doc.get("submitter_email")),
        ]
    )
    html = (
        '<div style="font-family:Arial,sans-serif;max-width:600px;">'
        f'<h2 style="color:#0f172a;">New {kind} submission received</h2>'
        '<p style="color:#475569;">A new opportunity was submitted for review on BitsNdBricks.</p>'
        f'<table style="border-collapse:collapse;font-size:14px;">{rows}</table>'
        '<p style="color:#94a3b8;font-size:12px;margin-top:16px;">Review it in the BitsNdBricks admin panel.</p>'
        '</div>'
    )
    payload = {
        "to": [ADMIN_NOTIFY_EMAIL],
        "subject": f"New {kind} submission — {doc.get('bnb_id')}",
        "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
    except Exception as e:
        logging.getLogger(__name__).error(f"Submission email failed: {e}")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "doc": "application/msword", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv", "txt": "text/plain",
}


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------- DB Helpers ----------------
def row_to_dict(row) -> dict:
    """Convert a SQLAlchemy Row to a plain dict."""
    if row is None:
        return None
    return dict(row._mapping)


def serialize_attachment(val):
    """Convert Pydantic FileRef (or dict) to JSON-safe dict for storage."""
    if val is None:
        return None
    if hasattr(val, "model_dump"):
        return val.model_dump()
    return val


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    return text[:80]


async def next_bnb_id(kind: str = "") -> str:
    """One continuous universal ID across all modules, e.g. BNB-000001. Never resets."""
    async with async_session() as session:
        async with session.begin():
            # Try to update existing counter
            result = await session.execute(
                update(counters)
                .where(counters.c.id == "bnb_universal")
                .values(seq=counters.c.seq + 1)
            )
            if result.rowcount == 0:
                # Counter doesn't exist yet, insert it
                await session.execute(
                    insert(counters).values(id="bnb_universal", seq=1)
                )
                return "BNB-000001"
            # Fetch the updated value
            row = await session.execute(
                select(counters.c.seq).where(counters.c.id == "bnb_universal")
            )
            seq = row.scalar_one()
            return f"BNB-{seq:06d}"


def compute_expiry(last_date: Optional[str], posted_date: str) -> str:
    if last_date:
        return last_date
    posted = datetime.fromisoformat(posted_date)
    return (posted + timedelta(days=14)).isoformat()


def build_slug(title: str, city: str, bnb_id: str) -> str:
    parts = [p for p in [slugify(title), slugify(city), bnb_id.lower()] if p]
    return "-".join(parts)


ID_REGEX = re.compile(r"(bnb-\d{6})", re.IGNORECASE)


def extract_bnb_id(slug_or_id: str) -> Optional[str]:
    m = ID_REGEX.search(slug_or_id)
    return m.group(1).upper() if m else None


async def archive_expired(collection_name: str):
    table = TABLE_MAP[collection_name]
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(table)
                .where(and_(table.c.status == "active", table.c.expiry_date < now_iso()))
                .values(status="archived")
            )


def clean(doc: dict) -> dict:
    """No _id in MySQL, but keep for API compat."""
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


def public_view(doc: dict) -> dict:
    """Strip internal-only fields for public responses."""
    doc = clean(dict(doc))
    for f in ["submitter_name", "submitter_company", "submitter_email",
              "submitter_phone", "submitter_notes", "submitter_contact",
              "source_type", "origin", "author_contact"]:
        doc.pop(f, None)
    doc["verified"] = doc.get("verification_status") == "verified"
    exp = doc.get("expiry_date")
    doc["is_expired"] = bool(exp and exp < now_iso())
    return doc


# ---------------- Models ----------------
SourceType = Literal["BNB Research", "Public Website", "Company Submission",
                     "Recruiter Submission", "Government Portal",
                     "Organization Submission", "Other"]
VerificationStatus = Literal["verified", "no_badge", "rejected"]
ListingStatus = Literal["draft", "pending", "active", "archived", "rejected"]


class FileRef(BaseModel):
    file_id: str
    filename: str
    url: str


class JobIn(BaseModel):
    title: str
    organization: str
    state: str
    city: str
    category: Optional[str] = None
    collar_type: Optional[str] = "Not Specified"
    trade: Optional[str] = None
    description: str
    last_date: Optional[str] = None
    applicant_email: Optional[str] = None
    applicant_phone: Optional[str] = None
    applicant_url: Optional[str] = None
    attachment: Optional[FileRef] = None
    source_type: SourceType = "BNB Research"
    verification_status: VerificationStatus = "no_badge"
    status: ListingStatus = "active"
    # submitter (internal)
    submitter_name: Optional[str] = None
    submitter_company: Optional[str] = None
    submitter_email: Optional[str] = None
    submitter_phone: Optional[str] = None
    submitter_notes: Optional[str] = None


class TenderIn(BaseModel):
    title: str
    organization: str
    state: str
    city: str
    category: Optional[str] = None
    authority_type: Optional[str] = None
    description: str
    last_date: Optional[str] = None
    estimated_value: Optional[str] = None
    original_reference: Optional[str] = None
    official_url: Optional[str] = None
    contact_clarifications: Optional[str] = None
    attachment: Optional[FileRef] = None
    source_type: SourceType = "BNB Research"
    verification_status: VerificationStatus = "no_badge"
    status: ListingStatus = "active"
    submitter_name: Optional[str] = None
    submitter_company: Optional[str] = None
    submitter_email: Optional[str] = None
    submitter_phone: Optional[str] = None
    submitter_notes: Optional[str] = None


class SubmissionIn(BaseModel):
    kind: Literal["job", "tender"]
    title: Optional[str] = None
    organization: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    last_date: Optional[str] = None
    # job
    collar_type: Optional[str] = "Not Specified"
    trade: Optional[str] = None
    applicant_email: Optional[str] = None
    applicant_phone: Optional[str] = None
    applicant_url: Optional[str] = None
    # tender
    authority_type: Optional[str] = None
    estimated_value: Optional[str] = None
    original_reference: Optional[str] = None
    official_url: Optional[str] = None
    contact_clarifications: Optional[str] = None
    attachment: Optional[FileRef] = None
    # submitter
    submitter_name: Optional[str] = None
    submitter_company: Optional[str] = None
    submitter_email: Optional[str] = None
    submitter_phone: Optional[str] = None
    submitter_notes: Optional[str] = None


# ---------------- Build doc ----------------
async def make_job_doc(data: dict) -> dict:
    posted = now_iso()
    bnb_id = await next_bnb_id()
    data["attachment"] = serialize_attachment(data.get("attachment"))
    doc = {
        "id": str(uuid.uuid4()),
        "bnb_id": bnb_id,
        "posted_date": posted,
        "expiry_date": compute_expiry(data.get("last_date"), posted),
        "created_at": posted,
        "updated_at": posted,
        **data,
    }
    doc["slug"] = build_slug(doc["title"], doc["city"], bnb_id)
    doc["record_type"] = "Job"
    doc.setdefault("origin", "BNB Created")
    return doc


async def make_tender_doc(data: dict) -> dict:
    posted = now_iso()
    bnb_id = await next_bnb_id()
    data["attachment"] = serialize_attachment(data.get("attachment"))
    doc = {
        "id": str(uuid.uuid4()),
        "bnb_id": bnb_id,
        "posted_date": posted,
        "expiry_date": compute_expiry(data.get("last_date"), posted),
        "created_at": posted,
        "updated_at": posted,
        **data,
    }
    doc["slug"] = build_slug(doc["title"], doc["city"], bnb_id)
    doc["record_type"] = "Tender"
    doc.setdefault("origin", "BNB Created")
    return doc


# ---------------- SQL filter helpers ----------------
def apply_sql_filters(table, conditions, search, state, city, category):
    """Build a list of SQLAlchemy WHERE clauses."""
    if state and state != "all":
        conditions.append(table.c.state == state)
    if city and city != "all":
        conditions.append(table.c.city == city)
    if category and category != "all" and hasattr(table.c, "category"):
        conditions.append(table.c.category == category)
    if search:
        like = f"%{search}%"
        search_cols = [table.c.title, table.c.organization, table.c.city, table.c.state, table.c.bnb_id]
        conditions.append(or_(*[c.ilike(like) for c in search_cols if hasattr(table.c, c.key)]))
    return conditions


# ---------------- Public: Jobs ----------------
@api_router.get("/jobs")
async def list_jobs(search: Optional[str] = None, state: Optional[str] = None,
                    city: Optional[str] = None, category: Optional[str] = None,
                    limit: int = 100):
    await archive_expired("jobs")
    conditions = [jobs.c.status == "active"]
    conditions = apply_sql_filters(jobs, conditions, search, state, city, category)
    async with async_session() as session:
        result = await session.execute(
            select(jobs).where(and_(*conditions)).order_by(jobs.c.posted_date.desc()).limit(limit)
        )
        rows = result.fetchall()
    return [public_view(row_to_dict(r)) for r in rows]


@api_router.get("/jobs/{slug}")
async def get_job(slug: str):
    await archive_expired("jobs")
    bnb_id = extract_bnb_id(slug) or slug.upper()
    async with async_session() as session:
        result = await session.execute(select(jobs).where(jobs.c.bnb_id == bnb_id))
        doc = result.fetchone()
        if not doc:
            result = await session.execute(select(jobs).where(jobs.c.slug == slug))
            doc = result.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    d = row_to_dict(doc)
    if d.get("status") in ("draft", "pending", "rejected"):
        raise HTTPException(status_code=404, detail="Job not found")
    return public_view(d)


# ---------------- Public: Tenders ----------------
@api_router.get("/tenders")
async def list_tenders(search: Optional[str] = None, state: Optional[str] = None,
                       city: Optional[str] = None, category: Optional[str] = None,
                       include_expired: bool = False, limit: int = 100):
    await archive_expired("tenders")
    if include_expired:
        conditions = [tenders.c.status.in_(["active", "archived"])]
    else:
        conditions = [tenders.c.status == "active"]
    conditions = apply_sql_filters(tenders, conditions, search, state, city, category)
    async with async_session() as session:
        result = await session.execute(
            select(tenders).where(and_(*conditions)).order_by(tenders.c.posted_date.desc()).limit(limit)
        )
        rows = result.fetchall()
    return [public_view(row_to_dict(r)) for r in rows]


@api_router.get("/tenders/{slug}")
async def get_tender(slug: str):
    await archive_expired("tenders")
    bnb_id = extract_bnb_id(slug) or slug.upper()
    async with async_session() as session:
        result = await session.execute(select(tenders).where(tenders.c.bnb_id == bnb_id))
        doc = result.fetchone()
        if not doc:
            result = await session.execute(select(tenders).where(tenders.c.slug == slug))
            doc = result.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Tender not found")
    d = row_to_dict(doc)
    if d.get("status") in ("draft", "pending", "rejected"):
        raise HTTPException(status_code=404, detail="Tender not found")
    return public_view(d)


# ---------------- Meta (filter options) ----------------
@api_router.get("/meta")
async def meta():
    async def loc(table, statuses):
        async with async_session() as session:
            result = await session.execute(
                select(table.c.state, table.c.city).where(table.c.status.in_(statuses))
            )
            rows = result.fetchall()
        states = sorted({r.state for r in rows if r.state})
        cities = sorted({r.city for r in rows if r.city})
        by_state = {}
        for r in rows:
            s, c = r.state, r.city
            if s and c:
                by_state.setdefault(s, set()).add(c)
        return states, cities, {k: sorted(v) for k, v in by_state.items()}

    j_states, j_cities, j_map = await loc(jobs, ["active"])
    t_states, t_cities, t_map = await loc(tenders, ["active", "archived"])
    w_states, w_cities, w_map = await loc(work_requirements, ["active", "archived"])

    async with async_session() as session:
        result = await session.execute(
            select(knowledge.c.tags).where(knowledge.c.status == "active")
        )
        rows = result.fetchall()
    k_tags = sorted({t for r in rows for t in (r.tags or [])})
    return {
        "job_states": j_states, "job_cities": j_cities, "job_cities_by_state": j_map,
        "tender_states": t_states, "tender_cities": t_cities, "tender_cities_by_state": t_map,
        "wr_states": w_states, "wr_cities": w_cities, "wr_cities_by_state": w_map,
        "knowledge_tags": k_tags,
    }


# ---------------- Submissions (public) ----------------
@api_router.post("/submissions")
async def create_submission(payload: SubmissionIn):
    data = payload.model_dump()
    kind = data.pop("kind")
    source_type = "Company Submission"
    common = {
        "source_type": source_type,
        "origin": "Public Submission",
        "verification_status": "no_badge",
        "status": "pending",
        "submitter_name": data.get("submitter_name"),
        "submitter_company": data.get("submitter_company"),
        "submitter_email": data.get("submitter_email"),
        "submitter_phone": data.get("submitter_phone"),
        "submitter_notes": data.get("submitter_notes"),
    }
    if kind == "job":
        job = {
            "title": data.get("title"), "organization": data.get("organization"),
            "state": data.get("state"), "city": data.get("city"),
            "description": data.get("description"), "last_date": data.get("last_date"),
            "collar_type": data.get("collar_type") or "Not Specified",
            "trade": data.get("trade"),
            "applicant_email": data.get("applicant_email"),
            "applicant_phone": data.get("applicant_phone"),
            "applicant_url": data.get("applicant_url"),
            "attachment": data.get("attachment"),
            "category": None, **common,
        }
        doc = await make_job_doc(job)
        async with async_session() as session:
            async with session.begin():
                await session.execute(insert(jobs).values(**doc))
    else:
        tender = {
            "title": data.get("title"), "organization": data.get("organization"),
            "state": data.get("state"), "city": data.get("city"),
            "description": data.get("description"), "last_date": data.get("last_date"),
            "authority_type": data.get("authority_type"),
            "estimated_value": data.get("estimated_value"),
            "original_reference": data.get("original_reference"),
            "official_url": data.get("official_url"),
            "contact_clarifications": data.get("contact_clarifications"),
            "attachment": data.get("attachment"),
            "category": None, **common,
        }
        doc = await make_tender_doc(tender)
        async with async_session() as session:
            async with session.begin():
                await session.execute(insert(tenders).values(**doc))
    await send_submission_email(kind, doc)
    return {"message": "submitted", "bnb_id": doc["bnb_id"]}


# ---------------- File upload ----------------
@api_router.post("/upload")
async def upload(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    data = await file.read()
    content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
    result = put_object(path, data, content_type)
    rec = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": now_iso(),
    }
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(files).values(**rec))
    url = f"/api/files/{file_id}"
    return {"file_id": file_id, "filename": file.filename, "url": url}


@api_router.get("/files/{file_id}")
async def download(file_id: str):
    async with async_session() as session:
        result = await session.execute(
            select(files).where(and_(files.c.id == file_id, files.c.is_deleted == False))
        )
        rec = result.fetchone()
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    rec = row_to_dict(rec)
    data, content_type = get_object(rec["storage_path"])
    return Response(
        content=data,
        media_type=rec.get("content_type", content_type),
        headers={"Content-Disposition": f'inline; filename="{rec["original_filename"]}"'},
    )


# ---------------- Admin ----------------
class AdminLogin(BaseModel):
    password: str


@api_router.post("/admin/login")
async def admin_login(payload: AdminLogin):
    if not hmac.compare_digest(payload.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"token": create_admin_token()}


@api_router.get("/admin/jobs")
async def admin_list_jobs(status: Optional[str] = None):
    await archive_expired("jobs")
    async with async_session() as session:
        q = select(jobs)
        if status and status != "all":
            q = q.where(jobs.c.status == status)
        result = await session.execute(q.order_by(jobs.c.created_at.desc()).limit(1000))
        rows = result.fetchall()
    return [clean(row_to_dict(r)) for r in rows]


@api_router.get("/admin/tenders")
async def admin_list_tenders(status: Optional[str] = None):
    await archive_expired("tenders")
    async with async_session() as session:
        q = select(tenders)
        if status and status != "all":
            q = q.where(tenders.c.status == status)
        result = await session.execute(q.order_by(tenders.c.created_at.desc()).limit(1000))
        rows = result.fetchall()
    return [clean(row_to_dict(r)) for r in rows]


@api_router.post("/admin/jobs")
async def admin_create_job(payload: JobIn):
    doc = await make_job_doc(payload.model_dump())
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(jobs).values(**doc))
    return clean(doc)


@api_router.post("/admin/tenders")
async def admin_create_tender(payload: TenderIn):
    doc = await make_tender_doc(payload.model_dump())
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(tenders).values(**doc))
    return clean(doc)


@api_router.put("/admin/jobs/{item_id}")
async def admin_update_job(item_id: str, payload: JobIn):
    async with async_session() as session:
        result = await session.execute(select(jobs).where(jobs.c.id == item_id))
        existing = result.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = row_to_dict(existing)
    data = payload.model_dump()
    data["attachment"] = serialize_attachment(data.get("attachment"))
    data["updated_at"] = now_iso()
    data["expiry_date"] = compute_expiry(data.get("last_date"), existing["posted_date"])
    data["slug"] = build_slug(data["title"], data["city"], existing["bnb_id"])
    async with async_session() as session:
        async with session.begin():
            await session.execute(update(jobs).where(jobs.c.id == item_id).values(**data))
        result = await session.execute(select(jobs).where(jobs.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.put("/admin/tenders/{item_id}")
async def admin_update_tender(item_id: str, payload: TenderIn):
    async with async_session() as session:
        result = await session.execute(select(tenders).where(tenders.c.id == item_id))
        existing = result.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Tender not found")
    existing = row_to_dict(existing)
    data = payload.model_dump()
    data["attachment"] = serialize_attachment(data.get("attachment"))
    data["updated_at"] = now_iso()
    data["expiry_date"] = compute_expiry(data.get("last_date"), existing["posted_date"])
    data["slug"] = build_slug(data["title"], data["city"], existing["bnb_id"])
    async with async_session() as session:
        async with session.begin():
            await session.execute(update(tenders).where(tenders.c.id == item_id).values(**data))
        result = await session.execute(select(tenders).where(tenders.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


class StatusUpdate(BaseModel):
    status: Optional[ListingStatus] = None
    verification_status: Optional[VerificationStatus] = None


class PrivateStatusUpdate(BaseModel):
    status: Literal["new", "reviewed", "archived"]


@api_router.patch("/admin/jobs/{item_id}/status")
async def admin_job_status(item_id: str, payload: StatusUpdate):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(update(jobs).where(jobs.c.id == item_id).values(**upd))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        result = await session.execute(select(jobs).where(jobs.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.patch("/admin/tenders/{item_id}/status")
async def admin_tender_status(item_id: str, payload: StatusUpdate):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(update(tenders).where(tenders.c.id == item_id).values(**upd))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tender not found")
        result = await session.execute(select(tenders).where(tenders.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.delete("/admin/jobs/{item_id}")
async def admin_delete_job(item_id: str):
    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(jobs).where(jobs.c.id == item_id))
    return {"message": "deleted"}


@api_router.delete("/admin/tenders/{item_id}")
async def admin_delete_tender(item_id: str):
    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(tenders).where(tenders.c.id == item_id))
    return {"message": "deleted"}


# ================= EXPANSION: Work Requirements / Resumes / Vendors =================
MOBILE_RE = re.compile(r"^[6-9]\d{9}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def valid_contact(v):
    return bool(v) and bool(MOBILE_RE.match(v) or EMAIL_RE.match(v))


RequirementType = Literal["Contractor / Consultancy", "Workmen / Labour", "Material", "Machinery"]


class WorkRequirementIn(BaseModel):
    requirement_type: RequirementType = "Contractor / Consultancy"
    title: Optional[str] = None
    organization: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    quantity: Optional[str] = None
    description: Optional[str] = None
    required_by: Optional[str] = None
    contact: Optional[str] = None
    attachment: Optional[FileRef] = None
    source_type: SourceType = "BNB Research"
    verification_status: VerificationStatus = "no_badge"
    status: ListingStatus = "active"
    submitter_name: Optional[str] = None
    submitter_contact: Optional[str] = None
    submitter_notes: Optional[str] = None


class WorkRequirementSubmit(BaseModel):
    requirement_type: RequirementType = "Contractor / Consultancy"
    title: Optional[str] = None
    organization: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    quantity: Optional[str] = None
    description: Optional[str] = None
    required_by: Optional[str] = None
    contact: Optional[str] = None
    attachment: Optional[FileRef] = None
    submitter_name: Optional[str] = None
    submitter_contact: Optional[str] = None
    submitter_notes: Optional[str] = None


class ResumeIn(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    preferred_role: Optional[str] = None
    experience: Optional[str] = None
    resume: Optional[FileRef] = None
    linkedin: Optional[str] = None
    other_info: Optional[str] = None
    declaration: bool = False


class VendorIn(BaseModel):
    company_name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    reg_state: Optional[str] = None
    reg_city: Optional[str] = None
    serviceable_locations: List[str] = []
    service_categories: List[str] = []
    service_categories_other: Optional[str] = None
    services_description: Optional[str] = None
    brochure: Optional[FileRef] = None
    declaration: bool = False


async def make_wr_doc(data: dict) -> dict:
    posted = now_iso()
    bnb_id = await next_bnb_id("WR")
    data["attachment"] = serialize_attachment(data.get("attachment"))
    doc = {
        "id": str(uuid.uuid4()), "bnb_id": bnb_id, "posted_date": posted,
        "expiry_date": compute_expiry(data.get("required_by"), posted),
        "created_at": posted, "updated_at": posted, **data,
    }
    doc["slug"] = build_slug(doc.get("title") or "requirement", doc.get("city") or "", bnb_id)
    return doc


# ---------- Public: Work Requirements ----------
@api_router.get("/work-requirements")
async def list_wr(search: Optional[str] = None, requirement_type: Optional[str] = None,
                  state: Optional[str] = None, city: Optional[str] = None,
                  include_expired: bool = False, limit: int = 100):
    await archive_expired("work_requirements")
    if include_expired:
        conditions = [work_requirements.c.status.in_(["active", "archived"])]
    else:
        conditions = [work_requirements.c.status == "active"]
    if requirement_type and requirement_type != "all":
        conditions.append(work_requirements.c.requirement_type == requirement_type)
    conditions = apply_sql_filters(work_requirements, conditions, search, state, city, None)
    async with async_session() as session:
        result = await session.execute(
            select(work_requirements).where(and_(*conditions))
            .order_by(work_requirements.c.posted_date.desc()).limit(limit)
        )
        rows = result.fetchall()
    return [public_view(row_to_dict(r)) for r in rows]


@api_router.get("/work-requirements/{slug}")
async def get_wr(slug: str):
    await archive_expired("work_requirements")
    bnb_id = extract_bnb_id(slug) or slug.upper()
    async with async_session() as session:
        result = await session.execute(
            select(work_requirements).where(work_requirements.c.bnb_id == bnb_id)
        )
        doc = result.fetchone()
        if not doc:
            result = await session.execute(
                select(work_requirements).where(work_requirements.c.slug == slug)
            )
            doc = result.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Requirement not found")
    d = row_to_dict(doc)
    if d.get("status") in ("draft", "pending", "rejected"):
        raise HTTPException(status_code=404, detail="Requirement not found")
    return public_view(d)


@api_router.post("/submissions/work-requirement")
async def submit_wr(payload: WorkRequirementSubmit):
    data = payload.model_dump()
    if data.get("contact") and not valid_contact(data["contact"]):
        raise HTTPException(status_code=422, detail="Contact must be a 10-digit mobile number or a valid email")
    data.update({"source_type": "Company Submission", "origin": "Public Submission", "verification_status": "no_badge", "status": "pending"})
    doc = await make_wr_doc(data)
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(work_requirements).values(**doc))
    await send_submission_email("work requirement", doc)
    return {"message": "submitted", "bnb_id": doc["bnb_id"]}


# ---------- Admin: Work Requirements ----------
@api_router.get("/admin/work-requirements")
async def admin_list_wr(status: Optional[str] = None):
    await archive_expired("work_requirements")
    async with async_session() as session:
        q = select(work_requirements)
        if status and status != "all":
            q = q.where(work_requirements.c.status == status)
        result = await session.execute(q.order_by(work_requirements.c.created_at.desc()).limit(1000))
        rows = result.fetchall()
    return [clean(row_to_dict(r)) for r in rows]


@api_router.post("/admin/work-requirements")
async def admin_create_wr(payload: WorkRequirementIn):
    data = payload.model_dump()
    if data.get("contact") and not valid_contact(data["contact"]):
        raise HTTPException(status_code=422, detail="Contact must be a 10-digit mobile number or a valid email")
    doc = await make_wr_doc(data)
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(work_requirements).values(**doc))
    return clean(doc)


@api_router.put("/admin/work-requirements/{item_id}")
async def admin_update_wr(item_id: str, payload: WorkRequirementIn):
    async with async_session() as session:
        result = await session.execute(select(work_requirements).where(work_requirements.c.id == item_id))
        existing = result.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    existing = row_to_dict(existing)
    data = payload.model_dump()
    data["attachment"] = serialize_attachment(data.get("attachment"))
    if data.get("contact") and not valid_contact(data["contact"]):
        raise HTTPException(status_code=422, detail="Contact must be a 10-digit mobile number or a valid email")
    data["updated_at"] = now_iso()
    data["expiry_date"] = compute_expiry(data.get("required_by"), existing["posted_date"])
    data["slug"] = build_slug(data.get("title") or "requirement", data.get("city") or "", existing["bnb_id"])
    async with async_session() as session:
        async with session.begin():
            await session.execute(update(work_requirements).where(work_requirements.c.id == item_id).values(**data))
        result = await session.execute(select(work_requirements).where(work_requirements.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.patch("/admin/work-requirements/{item_id}/status")
async def admin_wr_status(item_id: str, payload: StatusUpdate):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                update(work_requirements).where(work_requirements.c.id == item_id).values(**upd)
            )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Not found")
        result = await session.execute(select(work_requirements).where(work_requirements.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.delete("/admin/work-requirements/{item_id}")
async def admin_delete_wr(item_id: str):
    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(work_requirements).where(work_requirements.c.id == item_id))
    return {"message": "deleted"}


# ---------- Private: Resumes ----------
@api_router.post("/resumes")
async def submit_resume(payload: ResumeIn):
    data = payload.model_dump()
    if data.get("email") and not EMAIL_RE.match(data["email"]):
        raise HTTPException(status_code=422, detail="Invalid email")
    data["resume"] = serialize_attachment(data.get("resume"))
    bnb_id = await next_bnb_id()
    doc = {
        "id": str(uuid.uuid4()), "bnb_id": bnb_id, "record_type": "Resume",
        "origin": "Public Submission", "created_at": now_iso(), "status": "new", **data
    }
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(resumes).values(**doc))
    return {"message": "submitted", "bnb_id": bnb_id}


@api_router.get("/admin/resumes")
async def admin_list_resumes():
    async with async_session() as session:
        result = await session.execute(
            select(resumes).order_by(resumes.c.created_at.desc()).limit(2000)
        )
        rows = result.fetchall()
    return [clean(row_to_dict(r)) for r in rows]


@api_router.patch("/admin/resumes/{item_id}/status")
async def admin_resume_status(item_id: str, payload: PrivateStatusUpdate):
    upd = {"status": payload.status, "updated_at": now_iso()}
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                update(resumes).where(resumes.c.id == item_id).values(**upd)
            )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Not found")
        result = await session.execute(select(resumes).where(resumes.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.delete("/admin/resumes/{item_id}")
async def admin_delete_resume(item_id: str):
    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(resumes).where(resumes.c.id == item_id))
    return {"message": "deleted"}


# ---------- Private: Vendors ----------
@api_router.post("/vendors")
async def submit_vendor(payload: VendorIn):
    data = payload.model_dump()
    if data.get("email") and not EMAIL_RE.match(data["email"]):
        raise HTTPException(status_code=422, detail="Invalid email")
    data["brochure"] = serialize_attachment(data.get("brochure"))
    bnb_id = await next_bnb_id()
    doc = {
        "id": str(uuid.uuid4()), "bnb_id": bnb_id, "record_type": "Vendor",
        "origin": "Public Submission", "created_at": now_iso(), "status": "new", **data
    }
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(vendors).values(**doc))
    return {"message": "submitted", "bnb_id": bnb_id}


@api_router.get("/admin/vendors")
async def admin_list_vendors():
    async with async_session() as session:
        result = await session.execute(
            select(vendors).order_by(vendors.c.created_at.desc()).limit(2000)
        )
        rows = result.fetchall()
    return [clean(row_to_dict(r)) for r in rows]


@api_router.patch("/admin/vendors/{item_id}/status")
async def admin_vendor_status(item_id: str, payload: PrivateStatusUpdate):
    upd = {"status": payload.status, "updated_at": now_iso()}
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                update(vendors).where(vendors.c.id == item_id).values(**upd)
            )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Not found")
        result = await session.execute(select(vendors).where(vendors.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.delete("/admin/vendors/{item_id}")
async def admin_delete_vendor(item_id: str):
    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(vendors).where(vendors.c.id == item_id))
    return {"message": "deleted"}


# ---------- Knowledge Hub ----------
ContentType = Literal["Article", "Construction Technology", "Industry News"]


class KnowledgeIn(BaseModel):
    content_type: ContentType = "Article"
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    tags: List[str] = []
    source_url: Optional[str] = None
    cover_image: Optional[FileRef] = None
    attachment: Optional[FileRef] = None
    author_name: Optional[str] = None
    author_info: Optional[str] = None
    linkedin: Optional[str] = None
    profile_picture: Optional[FileRef] = None
    author_contact: Optional[str] = None
    declaration: bool = False
    source_type: Optional[str] = None
    verification_status: VerificationStatus = "no_badge"
    status: ListingStatus = "active"


class KnowledgeSubmit(BaseModel):
    content_type: ContentType = "Article"
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    tags: List[str] = []
    source_url: Optional[str] = None
    cover_image: Optional[FileRef] = None
    attachment: Optional[FileRef] = None
    author_name: Optional[str] = None
    author_info: Optional[str] = None
    linkedin: Optional[str] = None
    profile_picture: Optional[FileRef] = None
    author_contact: Optional[str] = None
    declaration: bool = False


async def make_knowledge_doc(data: dict) -> dict:
    posted = now_iso()
    bnb_id = await next_bnb_id()
    data["cover_image"] = serialize_attachment(data.get("cover_image"))
    data["attachment"] = serialize_attachment(data.get("attachment"))
    data["profile_picture"] = serialize_attachment(data.get("profile_picture"))
    doc = {
        "id": str(uuid.uuid4()), "bnb_id": bnb_id, "posted_date": posted,
        "created_at": posted, "updated_at": posted, **data,
    }
    doc["slug"] = f'{slugify(data.get("title") or "article")}-{bnb_id.lower()}'
    doc["record_type"] = "Knowledge Hub"
    doc.setdefault("origin", "BNB Created")
    return doc


@api_router.get("/knowledge")
async def list_knowledge(search: Optional[str] = None, tag: Optional[str] = None, limit: int = 100):
    conditions = [knowledge.c.status == "active"]
    if tag and tag != "all":
        # Search within JSON array for the tag
        conditions.append(knowledge.c.tags.like(f'%"{tag}"%'))
    if search:
        like = f"%{search}%"
        conditions.append(or_(
            knowledge.c.title.ilike(like),
            knowledge.c.summary.ilike(like),
            knowledge.c.author_name.ilike(like),
        ))
    async with async_session() as session:
        result = await session.execute(
            select(knowledge).where(and_(*conditions))
            .order_by(knowledge.c.posted_date.desc()).limit(limit)
        )
        rows = result.fetchall()
    return [public_view(row_to_dict(r)) for r in rows]


@api_router.get("/knowledge/{slug}")
async def get_knowledge(slug: str):
    async with async_session() as session:
        result = await session.execute(
            select(knowledge).where(knowledge.c.slug == slug)
        )
        doc = result.fetchone()
        if not doc:
            result = await session.execute(
                select(knowledge).where(knowledge.c.bnb_id == slug.upper())
            )
            doc = result.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    d = row_to_dict(doc)
    if d.get("status") != "active":
        raise HTTPException(status_code=404, detail="Article not found")
    return public_view(d)


@api_router.post("/submissions/knowledge")
async def submit_knowledge(payload: KnowledgeSubmit):
    data = payload.model_dump()
    if not data.get("declaration"):
        raise HTTPException(status_code=422, detail="Please confirm the declaration before submitting")
    if not (data.get("content") or "").strip():
        raise HTTPException(status_code=422, detail="Please add some content before submitting")
    data.update({"source_type": "Organization Submission", "origin": "Public Submission", "verification_status": "no_badge", "status": "pending"})
    doc = await make_knowledge_doc(data)
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(knowledge).values(**doc))
    await send_submission_email("knowledge article", doc)
    return {"message": "submitted", "bnb_id": doc["bnb_id"]}


@api_router.get("/admin/knowledge")
async def admin_list_knowledge(status: Optional[str] = None):
    async with async_session() as session:
        q = select(knowledge)
        if status and status != "all":
            q = q.where(knowledge.c.status == status)
        result = await session.execute(q.order_by(knowledge.c.created_at.desc()).limit(1000))
        rows = result.fetchall()
    return [clean(row_to_dict(r)) for r in rows]


@api_router.post("/admin/knowledge")
async def admin_create_knowledge(payload: KnowledgeIn):
    doc = await make_knowledge_doc(payload.model_dump())
    async with async_session() as session:
        async with session.begin():
            await session.execute(insert(knowledge).values(**doc))
    return clean(doc)


@api_router.put("/admin/knowledge/{item_id}")
async def admin_update_knowledge(item_id: str, payload: KnowledgeIn):
    async with async_session() as session:
        result = await session.execute(select(knowledge).where(knowledge.c.id == item_id))
        existing = result.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    existing = row_to_dict(existing)
    data = payload.model_dump()
    data["cover_image"] = serialize_attachment(data.get("cover_image"))
    data["attachment"] = serialize_attachment(data.get("attachment"))
    data["profile_picture"] = serialize_attachment(data.get("profile_picture"))
    data["updated_at"] = now_iso()
    data["slug"] = f'{slugify(data.get("title") or "article")}-{existing["bnb_id"].lower()}'
    async with async_session() as session:
        async with session.begin():
            await session.execute(update(knowledge).where(knowledge.c.id == item_id).values(**data))
        result = await session.execute(select(knowledge).where(knowledge.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.patch("/admin/knowledge/{item_id}/status")
async def admin_knowledge_status(item_id: str, payload: StatusUpdate):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                update(knowledge).where(knowledge.c.id == item_id).values(**upd)
            )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Not found")
        result = await session.execute(select(knowledge).where(knowledge.c.id == item_id))
        doc = result.fetchone()
    return clean(row_to_dict(doc))


@api_router.delete("/admin/knowledge/{item_id}")
async def admin_delete_knowledge(item_id: str):
    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(knowledge).where(knowledge.c.id == item_id))
    return {"message": "deleted"}


# ---------- Admin Dashboard Stats ----------
@api_router.get("/admin/stats")
async def admin_stats():
    for c in ["jobs", "tenders", "work_requirements"]:
        await archive_expired(c)
    public_mods = {"jobs": jobs, "tenders": tenders,
                   "work-requirements": work_requirements, "knowledge": knowledge}
    private_mods = {"resumes": resumes, "vendors": vendors}
    out = {"public": {}, "private": {}}
    for key, table in public_mods.items():
        async with async_session() as session:
            result = await session.execute(
                select(table.c.status, table.c.origin, table.c.source_type)
            )
            docs = [row_to_dict(r) for r in result.fetchall()]
        def origin_of(d):
            return d.get("origin") or ("BNB Created" if d.get("source_type") == "BNB Research" else "Public Submission")
        out["public"][key] = {
            "total": len(docs),
            "pending": sum(1 for d in docs if d.get("status") == "pending"),
            "published": sum(1 for d in docs if d.get("status") == "active"),
            "archived": sum(1 for d in docs if d.get("status") == "archived"),
            "bnb_created": sum(1 for d in docs if origin_of(d) == "BNB Created"),
            "public_submissions": sum(1 for d in docs if origin_of(d) == "Public Submission"),
        }
    for key, table in private_mods.items():
        async with async_session() as session:
            result = await session.execute(select(table.c.status))
            docs = [row_to_dict(r) for r in result.fetchall()]
        out["private"][key] = {
            "total": len(docs),
            "new_pending": sum(1 for d in docs if d.get("status") in ("new", "pending")),
            "reviewed": sum(1 for d in docs if d.get("status") in ("reviewed", "active")),
            "archived": sum(1 for d in docs if d.get("status") == "archived"),
        }
    return out


# ---------- Excel Export ----------
EXPORT_COLUMNS = {
    "jobs": ["bnb_id", "record_type", "origin", "title", "organization", "state", "city", "category", "collar_type", "trade",
             "last_date", "applicant_email", "applicant_phone", "applicant_url", "source_type",
             "verification_status", "status", "posted_date", "submitter_name", "submitter_email",
             "submitter_phone", "submitter_notes"],
    "tenders": ["bnb_id", "record_type", "origin", "title", "organization", "state", "city", "authority_type", "estimated_value",
                "original_reference", "official_url", "last_date", "contact_clarifications", "source_type",
                "verification_status", "status", "posted_date", "submitter_name", "submitter_email",
                "submitter_phone", "submitter_notes"],
    "work-requirements": ["bnb_id", "record_type", "origin", "requirement_type", "title", "organization", "state", "city", "quantity",
                          "required_by", "contact", "source_type", "verification_status", "status",
                          "posted_date", "submitter_name", "submitter_contact", "submitter_notes"],
    "resumes": ["bnb_id", "record_type", "full_name", "email", "phone", "location", "preferred_role", "experience",
                "linkedin", "resume", "other_info", "status", "created_at"],
    "vendors": ["bnb_id", "record_type", "company_name", "contact_person", "email", "phone", "website", "reg_state",
                "reg_city", "serviceable_locations", "service_categories", "service_categories_other",
                "services_description", "brochure", "status", "created_at"],
    "knowledge": ["bnb_id", "record_type", "origin", "content_type", "title", "summary", "tags", "author_name", "author_info",
                  "linkedin", "author_contact", "source_url", "source_type", "verification_status", "status", "posted_date"],
}
EXPORT_TABLE = {"jobs": jobs, "tenders": tenders, "work-requirements": work_requirements,
               "resumes": resumes, "vendors": vendors, "knowledge": knowledge}


def _cell(v):
    if isinstance(v, list):
        return ", ".join(str(x) for x in v)
    if isinstance(v, dict):
        return v.get("filename") or v.get("url") or ""
    return "" if v is None else str(v)


@api_router.get("/admin/export/{module}")
async def export_module(module: str, status: Optional[str] = None, state: Optional[str] = None):
    if module not in EXPORT_TABLE:
        raise HTTPException(status_code=404, detail="Unknown module")
    table = EXPORT_TABLE[module]
    conditions = []
    if status and status != "all":
        conditions.append(table.c.status == status)
    if state and state != "all" and hasattr(table.c, "state"):
        conditions.append(table.c.state == state)
    async with async_session() as session:
        q = select(table)
        if conditions:
            q = q.where(and_(*conditions))
        result = await session.execute(q.order_by(table.c.created_at.desc()).limit(5000))
        docs = [row_to_dict(r) for r in result.fetchall()]
    cols = EXPORT_COLUMNS[module]
    wb = Workbook()
    ws = wb.active
    ws.title = module[:31]
    ws.append(cols)
    for d in docs:
        ws.append([_cell(d.get(c)) for c in cols])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StarletteResponse(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="bnb-{module}.xlsx"'},
    )


@api_router.get("/sitemap.xml")
async def sitemap():
    await archive_expired("jobs")
    await archive_expired("tenders")
    base = SITE_URL
    urls = [f"{base}/", f"{base}/jobs", f"{base}/tenders", f"{base}/submit",
            f"{base}/privacy", f"{base}/disclaimer", f"{base}/terms"]

    async with async_session() as session:
        result = await session.execute(select(jobs.c.slug).where(jobs.c.status == "active"))
        job_slugs = [r.slug for r in result.fetchall()]

        result = await session.execute(
            select(tenders.c.slug).where(tenders.c.status.in_(["active", "archived"]))
        )
        tender_slugs = [r.slug for r in result.fetchall()]

        result = await session.execute(
            select(work_requirements.c.slug).where(work_requirements.c.status.in_(["active", "archived"]))
        )
        wr_slugs = [r.slug for r in result.fetchall()]

        result = await session.execute(
            select(knowledge.c.slug).where(knowledge.c.status == "active")
        )
        kno_slugs = [r.slug for r in result.fetchall()]

    urls += [f"{base}/jobs/{s}" for s in job_slugs]
    urls += [f"{base}/tenders/{s}" for s in tender_slugs]
    urls += [f"{base}/work-requirements/{s}" for s in wr_slugs]
    urls += [f"{base}/knowledge-hub/{s}" for s in kno_slugs]
    urls.append(f"{base}/work-requirements")
    urls.append(f"{base}/knowledge-hub")
    items = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'
    return StarletteResponse(content=xml, media_type="application/xml")


@api_router.get("/")
async def root():
    return {"message": "BitsNdBricks API"}


app.include_router(api_router)


@app.middleware("http")
async def admin_guard(request: Request, call_next):
    path = request.url.path
    if request.method != "OPTIONS" and path.startswith("/api/admin/") and path != "/api/admin/login":
        auth = request.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        if not verify_admin_token(token):
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    # Initialize database tables
    await init_db()
    logger.info("MySQL database initialized")
    # Initialize object storage
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    await dispose_db()
