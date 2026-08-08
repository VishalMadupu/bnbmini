from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query, Response, Request
from starlette.responses import JSONResponse, Response as StarletteResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
import hmac
import jwt
import httpx
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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


# ---------------- Helpers ----------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    return text[:80]


async def next_bnb_id(kind: str) -> str:
    """kind = 'J' or 'T'. Sequential permanent IDs like BNB-J-2026-00001."""
    year = datetime.now(timezone.utc).year
    counter_id = f"{kind}-{year}"
    doc = await db.counters.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = doc["seq"]
    return f"BNB-{kind}-{year}-{seq:05d}"


def compute_expiry(last_date: Optional[str], posted_date: str) -> str:
    if last_date:
        return last_date
    posted = datetime.fromisoformat(posted_date)
    return (posted + timedelta(days=14)).isoformat()


def build_slug(title: str, city: str, bnb_id: str) -> str:
    parts = [p for p in [slugify(title), slugify(city), bnb_id.lower()] if p]
    return "-".join(parts)


ID_REGEX = re.compile(r"(bnb-[jt]-\d{4}-\d{5})", re.IGNORECASE)


def extract_bnb_id(slug_or_id: str) -> Optional[str]:
    m = ID_REGEX.search(slug_or_id)
    return m.group(1).upper() if m else None


async def archive_expired(collection):
    await db[collection].update_many(
        {"status": "active", "expiry_date": {"$lt": now_iso()}},
        {"$set": {"status": "archived"}},
    )


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def public_view(doc: dict) -> dict:
    """Strip internal-only fields for public responses."""
    doc = clean(dict(doc))
    for f in ["submitter_name", "submitter_company", "submitter_email",
              "submitter_phone", "submitter_notes", "source_type"]:
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
    bnb_id = await next_bnb_id("J")
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
    return doc


async def make_tender_doc(data: dict) -> dict:
    posted = now_iso()
    bnb_id = await next_bnb_id("T")
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
    return doc


# ---------------- Public: Jobs ----------------
def apply_filters(query: dict, search, state, city, category):
    if state and state != "all":
        query["state"] = state
    if city and city != "all":
        query["city"] = city
    if category and category != "all":
        query["category"] = category
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [
            {"title": rx}, {"organization": rx}, {"city": rx},
            {"state": rx}, {"bnb_id": rx},
        ]
    return query


@api_router.get("/jobs")
async def list_jobs(search: Optional[str] = None, state: Optional[str] = None,
                    city: Optional[str] = None, category: Optional[str] = None,
                    limit: int = 100):
    await archive_expired("jobs")
    query = apply_filters({"status": "active"}, search, state, city, category)
    docs = await db.jobs.find(query).sort("posted_date", -1).to_list(limit)
    return [public_view(d) for d in docs]


@api_router.get("/jobs/{slug}")
async def get_job(slug: str):
    await archive_expired("jobs")
    bnb_id = extract_bnb_id(slug) or slug.upper()
    doc = await db.jobs.find_one({"bnb_id": bnb_id})
    if not doc:
        doc = await db.jobs.find_one({"slug": slug})
    if not doc or doc.get("status") in ("draft", "pending", "rejected"):
        raise HTTPException(status_code=404, detail="Job not found")
    return public_view(doc)


# ---------------- Public: Tenders ----------------
@api_router.get("/tenders")
async def list_tenders(search: Optional[str] = None, state: Optional[str] = None,
                       city: Optional[str] = None, category: Optional[str] = None,
                       include_expired: bool = False, limit: int = 100):
    await archive_expired("tenders")
    base = {"status": {"$in": ["active", "archived"]}} if include_expired else {"status": "active"}
    query = apply_filters(base, search, state, city, category)
    docs = await db.tenders.find(query).sort("posted_date", -1).to_list(limit)
    return [public_view(d) for d in docs]


@api_router.get("/tenders/{slug}")
async def get_tender(slug: str):
    await archive_expired("tenders")
    bnb_id = extract_bnb_id(slug) or slug.upper()
    doc = await db.tenders.find_one({"bnb_id": bnb_id})
    if not doc:
        doc = await db.tenders.find_one({"slug": slug})
    if not doc or doc.get("status") in ("draft", "pending", "rejected"):
        raise HTTPException(status_code=404, detail="Tender not found")
    return public_view(doc)


# ---------------- Meta (filter options) ----------------
@api_router.get("/meta")
async def meta():
    job_states = await db.jobs.distinct("state", {"status": "active"})
    tender_states = await db.tenders.distinct("state", {"status": "active"})
    job_cities = await db.jobs.distinct("city", {"status": "active"})
    tender_cities = await db.tenders.distinct("city", {"status": "active"})
    return {
        "job_states": sorted([s for s in job_states if s]),
        "tender_states": sorted([s for s in tender_states if s]),
        "job_cities": sorted([c for c in job_cities if c]),
        "tender_cities": sorted([c for c in tender_cities if c]),
    }


# ---------------- Submissions (public) ----------------
@api_router.post("/submissions")
async def create_submission(payload: SubmissionIn):
    data = payload.model_dump()
    kind = data.pop("kind")
    source_type = "Company Submission"
    common = {
        "source_type": source_type,
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
        await db.jobs.insert_one(doc)
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
        await db.tenders.insert_one(doc)
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
    await db.files.insert_one(dict(rec))
    url = f"/api/files/{file_id}"
    return {"file_id": file_id, "filename": file.filename, "url": url}


@api_router.get("/files/{file_id}")
async def download(file_id: str):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
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
    query = {} if not status or status == "all" else {"status": status}
    docs = await db.jobs.find(query).sort("created_at", -1).to_list(1000)
    return [clean(d) for d in docs]


@api_router.get("/admin/tenders")
async def admin_list_tenders(status: Optional[str] = None):
    await archive_expired("tenders")
    query = {} if not status or status == "all" else {"status": status}
    docs = await db.tenders.find(query).sort("created_at", -1).to_list(1000)
    return [clean(d) for d in docs]


@api_router.post("/admin/jobs")
async def admin_create_job(payload: JobIn):
    doc = await make_job_doc(payload.model_dump())
    await db.jobs.insert_one(doc)
    return clean(doc)


@api_router.post("/admin/tenders")
async def admin_create_tender(payload: TenderIn):
    doc = await make_tender_doc(payload.model_dump())
    await db.tenders.insert_one(doc)
    return clean(doc)


@api_router.put("/admin/jobs/{item_id}")
async def admin_update_job(item_id: str, payload: JobIn):
    existing = await db.jobs.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    data = payload.model_dump()
    data["updated_at"] = now_iso()
    data["expiry_date"] = compute_expiry(data.get("last_date"), existing["posted_date"])
    data["slug"] = build_slug(data["title"], data["city"], existing["bnb_id"])
    await db.jobs.update_one({"id": item_id}, {"$set": data})
    doc = await db.jobs.find_one({"id": item_id})
    return clean(doc)


@api_router.put("/admin/tenders/{item_id}")
async def admin_update_tender(item_id: str, payload: TenderIn):
    existing = await db.tenders.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tender not found")
    data = payload.model_dump()
    data["updated_at"] = now_iso()
    data["expiry_date"] = compute_expiry(data.get("last_date"), existing["posted_date"])
    data["slug"] = build_slug(data["title"], data["city"], existing["bnb_id"])
    await db.tenders.update_one({"id": item_id}, {"$set": data})
    doc = await db.tenders.find_one({"id": item_id})
    return clean(doc)


class StatusUpdate(BaseModel):
    status: Optional[ListingStatus] = None
    verification_status: Optional[VerificationStatus] = None


@api_router.patch("/admin/jobs/{item_id}/status")
async def admin_job_status(item_id: str, payload: StatusUpdate):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    res = await db.jobs.update_one({"id": item_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return clean(await db.jobs.find_one({"id": item_id}))


@api_router.patch("/admin/tenders/{item_id}/status")
async def admin_tender_status(item_id: str, payload: StatusUpdate):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    upd["updated_at"] = now_iso()
    res = await db.tenders.update_one({"id": item_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tender not found")
    return clean(await db.tenders.find_one({"id": item_id}))


@api_router.delete("/admin/jobs/{item_id}")
async def admin_delete_job(item_id: str):
    await db.jobs.delete_one({"id": item_id})
    return {"message": "deleted"}


@api_router.delete("/admin/tenders/{item_id}")
async def admin_delete_tender(item_id: str):
    await db.tenders.delete_one({"id": item_id})
    return {"message": "deleted"}


@api_router.get("/sitemap.xml")
async def sitemap():
    await archive_expired("jobs")
    await archive_expired("tenders")
    base = SITE_URL
    urls = [f"{base}/", f"{base}/jobs", f"{base}/tenders", f"{base}/submit",
            f"{base}/privacy", f"{base}/disclaimer", f"{base}/terms"]
    jobs = await db.jobs.find({"status": "active"}, {"slug": 1}).to_list(1000)
    tenders = await db.tenders.find({"status": {"$in": ["active", "archived"]}}, {"slug": 1}).to_list(1000)
    urls += [f"{base}/jobs/{j['slug']}" for j in jobs]
    urls += [f"{base}/tenders/{t['slug']}" for t in tenders]
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
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
