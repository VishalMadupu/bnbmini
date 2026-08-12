"""Database layer — SQLAlchemy async with MySQL (aiomysql)."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import (
    MetaData, Table, Column, String, Text, Boolean, Integer, BigInteger,
    DateTime, JSON, Index, text,
)
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MYSQL_URL = os.environ["MYSQL_URL"]

engine = create_async_engine(MYSQL_URL, pool_pre_ping=True, pool_size=10, max_overflow=20)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

metadata = MetaData()

# ---- counters (auto-increment sequence emulation) ----
counters = Table(
    "counters", metadata,
    Column("id", String(64), primary_key=True),
    Column("seq", BigInteger, nullable=False, server_default=text("0")),
)

# ---- files ----
files = Table(
    "files", metadata,
    Column("id", String(36), primary_key=True),
    Column("storage_path", String(512)),
    Column("original_filename", String(512)),
    Column("content_type", String(128)),
    Column("size", BigInteger, default=0),
    Column("is_deleted", Boolean, default=False),
    Column("created_at", String(64)),
)

# ---- jobs ----
jobs = Table(
    "jobs", metadata,
    Column("id", String(36), primary_key=True),
    Column("bnb_id", String(20), unique=True, nullable=False),
    Column("slug", String(256)),
    Column("record_type", String(32), default="Job"),
    Column("origin", String(64)),
    Column("title", String(512)),
    Column("organization", String(512)),
    Column("state", String(128)),
    Column("city", String(128)),
    Column("category", String(128)),
    Column("collar_type", String(64), default="Not Specified"),
    Column("trade", String(128)),
    Column("description", Text),
    Column("last_date", String(64)),
    Column("applicant_email", String(256)),
    Column("applicant_phone", String(64)),
    Column("applicant_url", String(512)),
    Column("attachment", JSON),
    Column("source_type", String(64), default="BNB Research"),
    Column("verification_status", String(32), default="no_badge"),
    Column("status", String(32), default="active"),
    Column("posted_date", String(64)),
    Column("expiry_date", String(64)),
    Column("submitter_name", String(256)),
    Column("submitter_company", String(256)),
    Column("submitter_email", String(256)),
    Column("submitter_phone", String(64)),
    Column("submitter_notes", Text),
    Column("created_at", String(64)),
    Column("updated_at", String(64)),
    Index("ix_jobs_status", "status"),
    Index("ix_jobs_state", "state"),
    Index("ix_jobs_city", "city"),
)

# ---- tenders ----
tenders = Table(
    "tenders", metadata,
    Column("id", String(36), primary_key=True),
    Column("bnb_id", String(20), unique=True, nullable=False),
    Column("slug", String(256)),
    Column("record_type", String(32), default="Tender"),
    Column("origin", String(64)),
    Column("title", String(512)),
    Column("organization", String(512)),
    Column("state", String(128)),
    Column("city", String(128)),
    Column("category", String(128)),
    Column("authority_type", String(128)),
    Column("description", Text),
    Column("last_date", String(64)),
    Column("estimated_value", String(128)),
    Column("original_reference", String(256)),
    Column("official_url", String(512)),
    Column("contact_clarifications", Text),
    Column("attachment", JSON),
    Column("source_type", String(64), default="BNB Research"),
    Column("verification_status", String(32), default="no_badge"),
    Column("status", String(32), default="active"),
    Column("posted_date", String(64)),
    Column("expiry_date", String(64)),
    Column("submitter_name", String(256)),
    Column("submitter_company", String(256)),
    Column("submitter_email", String(256)),
    Column("submitter_phone", String(64)),
    Column("submitter_notes", Text),
    Column("created_at", String(64)),
    Column("updated_at", String(64)),
    Index("ix_tenders_status", "status"),
    Index("ix_tenders_state", "state"),
)

# ---- work_requirements ----
work_requirements = Table(
    "work_requirements", metadata,
    Column("id", String(36), primary_key=True),
    Column("bnb_id", String(20), unique=True, nullable=False),
    Column("slug", String(256)),
    Column("record_type", String(32), default="Work Requirement"),
    Column("origin", String(64)),
    Column("requirement_type", String(64), default="Contractor / Consultancy"),
    Column("title", String(512)),
    Column("organization", String(512)),
    Column("state", String(128)),
    Column("city", String(128)),
    Column("quantity", String(256)),
    Column("description", Text),
    Column("required_by", String(64)),
    Column("contact", String(256)),
    Column("attachment", JSON),
    Column("source_type", String(64), default="BNB Research"),
    Column("verification_status", String(32), default="no_badge"),
    Column("status", String(32), default="active"),
    Column("posted_date", String(64)),
    Column("expiry_date", String(64)),
    Column("submitter_name", String(256)),
    Column("submitter_contact", String(256)),
    Column("submitter_notes", Text),
    Column("created_at", String(64)),
    Column("updated_at", String(64)),
    Index("ix_wr_status", "status"),
    Index("ix_wr_state", "state"),
)

# ---- knowledge ----
knowledge = Table(
    "knowledge", metadata,
    Column("id", String(36), primary_key=True),
    Column("bnb_id", String(20), unique=True, nullable=False),
    Column("slug", String(256)),
    Column("record_type", String(32), default="Knowledge Hub"),
    Column("origin", String(64)),
    Column("content_type", String(64), default="Article"),
    Column("title", String(512)),
    Column("summary", Text),
    Column("content", Text),
    Column("tags", JSON),
    Column("source_url", String(512)),
    Column("cover_image", JSON),
    Column("attachment", JSON),
    Column("author_name", String(256)),
    Column("author_info", Text),
    Column("linkedin", String(512)),
    Column("profile_picture", JSON),
    Column("author_contact", String(256)),
    Column("declaration", Boolean, default=False),
    Column("source_type", String(64)),
    Column("verification_status", String(32), default="no_badge"),
    Column("status", String(32), default="active"),
    Column("posted_date", String(64)),
    Column("created_at", String(64)),
    Column("updated_at", String(64)),
    Index("ix_knowledge_status", "status"),
)

# ---- resumes ----
resumes = Table(
    "resumes", metadata,
    Column("id", String(36), primary_key=True),
    Column("bnb_id", String(20), unique=True, nullable=False),
    Column("record_type", String(32), default="Resume"),
    Column("origin", String(64)),
    Column("full_name", String(256)),
    Column("email", String(256)),
    Column("phone", String(64)),
    Column("location", String(256)),
    Column("preferred_role", String(256)),
    Column("experience", String(256)),
    Column("resume", JSON),
    Column("linkedin", String(512)),
    Column("other_info", Text),
    Column("declaration", Boolean, default=False),
    Column("status", String(32), default="new"),
    Column("created_at", String(64)),
    Column("updated_at", String(64)),
)

# ---- vendors ----
vendors = Table(
    "vendors", metadata,
    Column("id", String(36), primary_key=True),
    Column("bnb_id", String(20), unique=True, nullable=False),
    Column("record_type", String(32), default="Vendor"),
    Column("origin", String(64)),
    Column("company_name", String(512)),
    Column("contact_person", String(256)),
    Column("email", String(256)),
    Column("phone", String(64)),
    Column("website", String(512)),
    Column("reg_state", String(128)),
    Column("reg_city", String(128)),
    Column("serviceable_locations", JSON),
    Column("service_categories", JSON),
    Column("service_categories_other", String(512)),
    Column("services_description", Text),
    Column("brochure", JSON),
    Column("declaration", Boolean, default=False),
    Column("status", String(32), default="new"),
    Column("created_at", String(64)),
    Column("updated_at", String(64)),
)

# Table lookup for dynamic access
TABLE_MAP = {
    "jobs": jobs,
    "tenders": tenders,
    "work_requirements": work_requirements,
    "knowledge": knowledge,
    "resumes": resumes,
    "vendors": vendors,
    "files": files,
    "counters": counters,
}


async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)


async def dispose_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
