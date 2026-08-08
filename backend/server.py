from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Query, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
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
    title: str
    organization: str
    state: str
    city: str
    description: str
    last_date: Optional[str] = None
    # job
    applicant_email: Optional[str] = None
    applicant_phone: Optional[str] = None
    applicant_url: Optional[str] = None
    # tender
    estimated_value: Optional[str] = None
    original_reference: Optional[str] = None
    official_url: Optional[str] = None
    contact_clarifications: Optional[str] = None
    attachment: Optional[FileRef] = None
    # submitter
    submitter_name: str
    submitter_company: Optional[str] = None
    submitter_email: str
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
                       limit: int = 100):
    await archive_expired("tenders")
    query = apply_filters({"status": "active"}, search, state, city, category)
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
            "title": data["title"], "organization": data["organization"],
            "state": data["state"], "city": data["city"],
            "description": data["description"], "last_date": data.get("last_date"),
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
            "title": data["title"], "organization": data["organization"],
            "state": data["state"], "city": data["city"],
            "description": data["description"], "last_date": data.get("last_date"),
            "estimated_value": data.get("estimated_value"),
            "original_reference": data.get("original_reference"),
            "official_url": data.get("official_url"),
            "contact_clarifications": data.get("contact_clarifications"),
            "attachment": data.get("attachment"),
            "category": None, **common,
        }
        doc = await make_tender_doc(tender)
        await db.tenders.insert_one(doc)
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


@api_router.get("/")
async def root():
    return {"message": "BitsNdBricks API"}


app.include_router(api_router)

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
