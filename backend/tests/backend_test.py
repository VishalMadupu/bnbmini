"""BitsNdBricks Backend API tests."""
import os
import io
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback: read frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---- Public: Meta, Jobs, Tenders ----
class TestPublic:
    def test_meta(self, s):
        r = s.get(f"{API}/meta")
        assert r.status_code == 200
        d = r.json()
        for k in ["job_states", "tender_states", "job_cities", "tender_cities"]:
            assert k in d and isinstance(d[k], list)

    def test_list_jobs_seeded(self, s):
        r = s.get(f"{API}/jobs")
        assert r.status_code == 200
        jobs = r.json()
        assert isinstance(jobs, list)
        assert len(jobs) >= 1
        j = jobs[0]
        # public_view must strip submitter fields and source_type
        for f in ["submitter_name", "submitter_company", "submitter_email",
                  "submitter_phone", "submitter_notes", "source_type", "_id"]:
            assert f not in j, f"public leak: {f}"
        assert "verified" in j
        assert "bnb_id" in j and j["bnb_id"].startswith("BNB-J-")

    def test_list_tenders_seeded(self, s):
        r = s.get(f"{API}/tenders")
        assert r.status_code == 200
        tenders = r.json()
        assert len(tenders) >= 1
        t = tenders[0]
        for f in ["submitter_name", "submitter_email", "source_type", "_id"]:
            assert f not in t
        assert t["bnb_id"].startswith("BNB-T-")

    def test_jobs_search_and_filter(self, s):
        # Filter by state present in meta
        meta = s.get(f"{API}/meta").json()
        if meta["job_states"]:
            st = meta["job_states"][0]
            r = s.get(f"{API}/jobs", params={"state": st})
            assert r.status_code == 200
            for j in r.json():
                assert j["state"] == st

    def test_get_job_by_bnb_id(self, s):
        r = s.get(f"{API}/jobs/BNB-J-2026-00001")
        assert r.status_code == 200
        assert r.json()["bnb_id"] == "BNB-J-2026-00001"

    def test_get_job_by_slug(self, s):
        # Fetch list first, then use slug
        jobs = s.get(f"{API}/jobs").json()
        slug = jobs[0]["slug"]
        r = s.get(f"{API}/jobs/{slug}")
        assert r.status_code == 200
        assert r.json()["bnb_id"] == jobs[0]["bnb_id"]

    def test_get_tender_by_bnb_id(self, s):
        r = s.get(f"{API}/tenders/BNB-T-2026-00001")
        assert r.status_code == 200
        assert r.json()["bnb_id"] == "BNB-T-2026-00001"

    def test_get_job_404(self, s):
        r = s.get(f"{API}/jobs/BNB-J-2026-99999")
        assert r.status_code == 404


# ---- Submissions (public, becomes pending, hidden from public list) ----
class TestSubmissions:
    def test_submit_job_pending_hidden(self, s):
        payload = {
            "kind": "job", "title": "TEST_Public Job Sub",
            "organization": "TEST Org", "state": "TestState",
            "city": "TestCity", "description": "Test job description",
            "applicant_email": "apply@test.com",
            "submitter_name": "Submitter", "submitter_email": "sub@test.com",
        }
        r = s.post(f"{API}/submissions", json=payload)
        assert r.status_code == 200, r.text
        bnb = r.json()["bnb_id"]
        assert bnb.startswith("BNB-J-")
        # Should NOT appear in public list
        listing = s.get(f"{API}/jobs", params={"search": "TEST_Public Job Sub"}).json()
        assert not any(j["bnb_id"] == bnb for j in listing)
        # Should 404 on public detail (pending)
        r2 = s.get(f"{API}/jobs/{bnb}")
        assert r2.status_code == 404
        pytest.submitted_job_bnb = bnb

    def test_submit_tender_pending(self, s):
        payload = {
            "kind": "tender", "title": "TEST_Public Tender Sub",
            "organization": "TEST Org", "state": "TS", "city": "TC",
            "description": "Test tender desc",
            "official_url": "https://example.com/tender",
            "submitter_name": "Submitter", "submitter_email": "sub@test.com",
        }
        r = s.post(f"{API}/submissions", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["bnb_id"].startswith("BNB-T-")


# ---- File upload / download ----
class TestUpload:
    def test_upload_and_download(self, s):
        files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
        r = s.post(f"{API}/upload", files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "file_id" in d and "url" in d
        fid = d["file_id"]
        # Download
        r2 = s.get(f"{BASE_URL}{d['url']}")
        assert r2.status_code == 200
        assert r2.content == b"hello world"


# ---- Admin CRUD ----
class TestAdmin:
    created_job_id = None
    created_tender_id = None
    created_job_bnb = None

    def test_admin_list_jobs_all_statuses(self, s):
        r = s.get(f"{API}/admin/jobs")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 6
        statuses = {d["status"] for d in docs}
        # Pending submissions should be visible in admin
        # (from submissions test earlier)

    def test_admin_list_tenders_all(self, s):
        r = s.get(f"{API}/admin/tenders")
        assert r.status_code == 200
        assert len(r.json()) >= 6

    def test_admin_create_job_sequential_id(self, s):
        # Get current max seq
        all_jobs = s.get(f"{API}/admin/jobs").json()
        max_seq = max(int(j["bnb_id"].split("-")[-1]) for j in all_jobs)
        payload = {
            "title": "TEST_Admin Job", "organization": "TEST",
            "state": "TS", "city": "TC", "description": "desc",
            "applicant_url": "https://example.com",
        }
        r = s.post(f"{API}/admin/jobs", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        new_seq = int(d["bnb_id"].split("-")[-1])
        assert new_seq > max_seq
        TestAdmin.created_job_id = d["id"]
        TestAdmin.created_job_bnb = d["bnb_id"]

    def test_admin_create_tender_sequential_id(self, s):
        all_t = s.get(f"{API}/admin/tenders").json()
        max_seq = max(int(t["bnb_id"].split("-")[-1]) for t in all_t)
        payload = {
            "title": "TEST_Admin Tender", "organization": "TEST",
            "state": "TS", "city": "TC", "description": "desc",
            "official_url": "https://gov.example.com",
        }
        r = s.post(f"{API}/admin/tenders", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert int(d["bnb_id"].split("-")[-1]) > max_seq
        TestAdmin.created_tender_id = d["id"]

    def test_admin_update_job(self, s):
        assert TestAdmin.created_job_id
        payload = {
            "title": "TEST_Admin Job Updated", "organization": "TEST",
            "state": "TS", "city": "TC", "description": "updated desc",
        }
        r = s.put(f"{API}/admin/jobs/{TestAdmin.created_job_id}", json=payload)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Admin Job Updated"

    def test_admin_verify_job(self, s):
        r = s.patch(
            f"{API}/admin/jobs/{TestAdmin.created_job_id}/status",
            json={"verification_status": "verified"},
        )
        assert r.status_code == 200
        assert r.json()["verification_status"] == "verified"
        # Public should show verified true
        pub = s.get(f"{API}/jobs/{TestAdmin.created_job_bnb}")
        assert pub.status_code == 200
        assert pub.json()["verified"] is True

    def test_admin_archive_hides_from_public(self, s):
        r = s.patch(
            f"{API}/admin/jobs/{TestAdmin.created_job_id}/status",
            json={"status": "archived"},
        )
        assert r.status_code == 200
        pub = s.get(f"{API}/jobs/{TestAdmin.created_job_bnb}")
        # archived not in explicit hidden list but not active either
        # get_job hides draft/pending/rejected; archived allowed to be fetched
        # but not in list
        listing = s.get(f"{API}/jobs").json()
        assert not any(j["bnb_id"] == TestAdmin.created_job_bnb for j in listing)

    def test_admin_publish_pending(self, s):
        # Create pending via submission then publish it
        sub = {
            "kind": "job", "title": "TEST_ToPublish", "organization": "T",
            "state": "TS", "city": "TC", "description": "d",
            "submitter_name": "X", "submitter_email": "x@x.com",
        }
        s.post(f"{API}/submissions", json=sub).raise_for_status()
        # Find in admin
        docs = s.get(f"{API}/admin/jobs", params={"status": "pending"}).json()
        target = next(d for d in docs if d["title"] == "TEST_ToPublish")
        # submitter info visible in admin
        assert target.get("submitter_email") == "x@x.com"
        r = s.patch(f"{API}/admin/jobs/{target['id']}/status",
                    json={"status": "active"})
        assert r.status_code == 200
        # Now public list should include it
        listing = s.get(f"{API}/jobs", params={"search": "TEST_ToPublish"}).json()
        assert any(j["bnb_id"] == target["bnb_id"] for j in listing)

    def test_admin_delete(self, s):
        r = s.delete(f"{API}/admin/jobs/{TestAdmin.created_job_id}")
        assert r.status_code == 200

    def test_cleanup_tender(self, s):
        if TestAdmin.created_tender_id:
            s.delete(f"{API}/admin/tenders/{TestAdmin.created_tender_id}")

    def test_cleanup_all_test_prefixed(self, s):
        for coll in ["jobs", "tenders"]:
            docs = s.get(f"{API}/admin/{coll}").json()
            for d in docs:
                if d.get("title", "").startswith("TEST_"):
                    s.delete(f"{API}/admin/{coll}/{d['id']}")
