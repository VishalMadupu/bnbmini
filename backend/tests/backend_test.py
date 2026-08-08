"""BitsNdBricks Backend API tests - Iteration 2 (admin auth + new fields + sitemap)."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_PASSWORD = "bitsadmin123"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin(s, admin_token):
    s2 = requests.Session()
    s2.headers.update({"Authorization": f"Bearer {admin_token}"})
    return s2


# ---- Admin Auth ----
class TestAdminAuth:
    def test_admin_jobs_requires_auth(self, s):
        r = s.get(f"{API}/admin/jobs")
        assert r.status_code == 401

    def test_admin_tenders_requires_auth(self, s):
        r = s.get(f"{API}/admin/tenders")
        assert r.status_code == 401

    def test_admin_login_wrong_password(self, s):
        r = s.post(f"{API}/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_admin_login_success(self, s):
        r = s.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "token" in r.json() and len(r.json()["token"]) > 20

    def test_admin_with_token_ok(self, admin):
        r = admin.get(f"{API}/admin/jobs")
        assert r.status_code == 200
        r2 = admin.get(f"{API}/admin/tenders")
        assert r2.status_code == 200

    def test_admin_with_bad_token(self, s):
        r = s.get(f"{API}/admin/jobs",
                  headers={"Authorization": "Bearer notavalidtoken"})
        assert r.status_code == 401


# ---- Public: Meta, Jobs, Tenders ----
class TestPublic:
    def test_meta(self, s):
        r = s.get(f"{API}/meta")
        assert r.status_code == 200
        for k in ["job_states", "tender_states", "job_cities", "tender_cities"]:
            assert k in r.json()

    def test_list_jobs_public_view(self, s):
        r = s.get(f"{API}/jobs")
        assert r.status_code == 200
        jobs = r.json()
        assert isinstance(jobs, list) and len(jobs) >= 1
        j = jobs[0]
        for f in ["submitter_name", "submitter_email", "source_type", "_id"]:
            assert f not in j
        assert "verified" in j and "is_expired" in j
        assert j["bnb_id"].startswith("BNB-J-")

    def test_list_tenders_default_no_expired(self, s):
        r = s.get(f"{API}/tenders")
        assert r.status_code == 200
        for t in r.json():
            assert t["is_expired"] is False

    def test_list_tenders_include_expired(self, s):
        r = s.get(f"{API}/tenders", params={"include_expired": "true"})
        assert r.status_code == 200
        # Expired flag exists on all
        for t in r.json():
            assert "is_expired" in t

    def test_get_job_by_bnb_id(self, s):
        r = s.get(f"{API}/jobs/BNB-J-2026-00001")
        assert r.status_code == 200
        assert r.json()["bnb_id"] == "BNB-J-2026-00001"


# ---- Submissions ----
class TestSubmissions:
    def test_submit_minimal_kind_only(self, s):
        """All fields optional except kind."""
        r = s.post(f"{API}/submissions", json={"kind": "job"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("bnb_id", "").startswith("BNB-J-")
        pytest.minimal_bnb = d["bnb_id"]

    def test_minimal_submission_hidden_from_public(self, s):
        bnb = pytest.minimal_bnb
        listing = s.get(f"{API}/jobs").json()
        assert not any(j["bnb_id"] == bnb for j in listing)
        r = s.get(f"{API}/jobs/{bnb}")
        assert r.status_code == 404

    def test_submit_job_with_new_fields(self, s):
        payload = {
            "kind": "job", "title": "TEST_Sub With Collar",
            "collar_type": "Blue Collar", "trade": "Carpenter",
            "submitter_name": "Jane", "submitter_email": "j@t.com",
        }
        r = s.post(f"{API}/submissions", json=payload)
        assert r.status_code == 200

    def test_submit_tender_minimal(self, s):
        r = s.post(f"{API}/submissions", json={"kind": "tender"})
        assert r.status_code == 200
        assert r.json()["bnb_id"].startswith("BNB-T-")


# ---- New fields (admin) ----
class TestNewFields:
    def test_admin_create_job_with_collar_trade(self, admin):
        payload = {
            "title": "TEST_Job Collar", "organization": "TEST",
            "state": "Delhi", "city": "New Delhi",
            "description": "desc",
            "collar_type": "White Collar", "trade": "Electrical",
        }
        r = admin.post(f"{API}/admin/jobs", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["collar_type"] == "White Collar"
        assert d["trade"] == "Electrical"
        # Public detail returns them
        pub = admin.get(f"{API}/jobs/{d['bnb_id']}")
        assert pub.status_code == 200
        assert pub.json()["collar_type"] == "White Collar"
        assert pub.json()["trade"] == "Electrical"
        pytest.new_job_id = d["id"]

    def test_admin_create_tender_with_authority_type(self, admin):
        payload = {
            "title": "TEST_Tender Auth", "organization": "TEST",
            "state": "Ladakh", "city": "Leh",
            "description": "desc",
            "authority_type": "Central Government",
            "official_url": "https://gov.example.com",
        }
        r = admin.post(f"{API}/admin/tenders", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["authority_type"] == "Central Government"
        pub = admin.get(f"{API}/tenders/{d['bnb_id']}")
        assert pub.json()["authority_type"] == "Central Government"
        pytest.new_tender_id = d["id"]


# ---- Sitemap ----
class TestSitemap:
    def test_sitemap_xml(self, s):
        r = s.get(f"{API}/sitemap.xml")
        assert r.status_code == 200
        assert "xml" in r.headers.get("Content-Type", "")
        body = r.text
        assert body.startswith("<?xml")
        for path in ["/jobs", "/tenders", "/submit", "/privacy", "/disclaimer", "/terms"]:
            assert path in body, f"missing {path}"
        # Contains at least one listing url with bnb id
        assert "bnb-j-" in body.lower() or "BNB-J" in body


# ---- Upload ----
class TestUpload:
    def test_upload_download(self, s):
        files = {"file": ("t.txt", io.BytesIO(b"hi"), "text/plain")}
        r = s.post(f"{API}/upload", files=files)
        assert r.status_code == 200
        d = r.json()
        r2 = s.get(f"{BASE_URL}{d['url']}")
        assert r2.status_code == 200 and r2.content == b"hi"


# ---- Cleanup ----
class TestZCleanup:
    def test_cleanup_test_prefixed(self, admin):
        for coll in ["jobs", "tenders"]:
            docs = admin.get(f"{API}/admin/{coll}").json()
            for d in docs:
                title = d.get("title") or ""
                if title.startswith("TEST_") or (d.get("status") == "pending" and not title):
                    admin.delete(f"{API}/admin/{coll}/{d['id']}")
