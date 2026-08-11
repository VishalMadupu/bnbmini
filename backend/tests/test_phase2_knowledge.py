"""Phase-2 backend tests: Knowledge Hub + WR + Resume/Vendor privacy + Excel exports."""
import os
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
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Hitchhiker@360")

STATE = {}


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin(s):
    r = s.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    s2 = requests.Session()
    s2.headers.update({"Authorization": f"Bearer {tok}"})
    return s2


# --------- Knowledge Hub ---------
class TestKnowledgeSubmit:
    def test_submit_requires_declaration(self, s):
        r = s.post(f"{API}/submissions/knowledge", json={
            "title": "TEST_KH_NoDecl", "content": "<p>hi</p>", "declaration": False,
        })
        assert r.status_code == 422
        assert "declaration" in r.text.lower()

    def test_submit_requires_content(self, s):
        r = s.post(f"{API}/submissions/knowledge", json={
            "title": "TEST_KH_NoContent", "content": "  ", "declaration": True,
        })
        assert r.status_code == 422
        assert "content" in r.text.lower()

    def test_submit_ok(self, s):
        r = s.post(f"{API}/submissions/knowledge", json={
            "title": "TEST_KH_Article_A",
            "content": "<p>Hello <strong>World</strong></p><table><tr><td>a</td></tr></table>",
            "summary": "test summary",
            "tags": ["testing", "phase2"],
            "author_name": "Tester",
            "declaration": True,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["bnb_id"].startswith("BNB-K-2026-"), d
        STATE["kh_bnb"] = d["bnb_id"]

    def test_pending_not_public(self, s):
        bnb = STATE["kh_bnb"]
        listing = s.get(f"{API}/knowledge").json()
        assert not any(k.get("bnb_id") == bnb for k in listing)


class TestKnowledgeAdmin:
    def test_admin_lists_pending(self, admin):
        r = admin.get(f"{API}/admin/knowledge", params={"status": "pending"})
        assert r.status_code == 200
        items = r.json()
        target = [k for k in items if k["bnb_id"] == STATE["kh_bnb"]]
        assert target, f"submitted {STATE['kh_bnb']} not in admin pending list"
        STATE["kh_id"] = target[0]["id"]
        STATE["kh_slug"] = target[0]["slug"]

    def test_admin_publish(self, admin):
        r = admin.patch(f"{API}/admin/knowledge/{STATE['kh_id']}/status",
                        json={"status": "active", "verification_status": "verified"})
        assert r.status_code == 200
        assert r.json()["status"] == "active"

    def test_public_list_shows_published(self, s):
        listing = s.get(f"{API}/knowledge").json()
        assert any(k["bnb_id"] == STATE["kh_bnb"] for k in listing)

    def test_public_detail_by_slug(self, s):
        r = s.get(f"{API}/knowledge/{STATE['kh_slug']}")
        assert r.status_code == 200
        d = r.json()
        assert d["bnb_id"] == STATE["kh_bnb"]
        assert "<strong>World</strong>" in d.get("content", "")
        assert d.get("title") == "TEST_KH_Article_A"

    def test_public_detail_by_bnb_id(self, s):
        r = s.get(f"{API}/knowledge/{STATE['kh_bnb']}")
        assert r.status_code == 200

    def test_admin_create_direct(self, admin):
        r = admin.post(f"{API}/admin/knowledge", json={
            "title": "TEST_KH_AdminCreate",
            "content": "<p>admin created</p>",
            "tags": ["admin"],
            "status": "active",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["bnb_id"].startswith("BNB-K-")
        STATE["kh_admin_id"] = d["id"]
        # visible publicly since active
        listing = s_public().get(f"{API}/knowledge").json()
        assert any(k["bnb_id"] == d["bnb_id"] for k in listing)

    def test_meta_has_knowledge_tags(self, s):
        r = s.get(f"{API}/meta")
        assert r.status_code == 200
        assert "knowledge_tags" in r.json()


def s_public():
    return requests.Session()


# --------- Work Requirements ---------
class TestWorkRequirements:
    def test_submit_contact_invalid_rejected(self, s):
        r = s.post(f"{API}/submissions/work-requirement", json={
            "title": "TEST_WR_BadContact", "contact": "abc",
        })
        assert r.status_code == 422

    def test_submit_ok_no_contact(self, s):
        r = s.post(f"{API}/submissions/work-requirement", json={
            "title": "TEST_WR_A", "requirement_type": "Material",
            "state": "Karnataka", "city": "Bangalore",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["bnb_id"].startswith("BNB-WR-")
        STATE["wr_bnb"] = d["bnb_id"]

    def test_submit_ok_with_email(self, s):
        r = s.post(f"{API}/submissions/work-requirement", json={
            "title": "TEST_WR_B", "contact": "test@example.com",
        })
        assert r.status_code == 200

    def test_submit_ok_with_10digit_mobile(self, s):
        r = s.post(f"{API}/submissions/work-requirement", json={
            "title": "TEST_WR_C", "contact": "9876543210",
        })
        assert r.status_code == 200

    def test_wr_pending_not_public(self, s):
        bnb = STATE["wr_bnb"]
        assert not any(x["bnb_id"] == bnb for x in s.get(f"{API}/work-requirements").json())

    def test_admin_approve_wr(self, admin, s):
        items = admin.get(f"{API}/admin/work-requirements", params={"status": "pending"}).json()
        target = [x for x in items if x["bnb_id"] == STATE["wr_bnb"]]
        assert target
        wid = target[0]["id"]
        STATE["wr_id"] = wid
        STATE["wr_slug"] = target[0]["slug"]
        r = admin.patch(f"{API}/admin/work-requirements/{wid}/status", json={"status": "active"})
        assert r.status_code == 200
        pub = s.get(f"{API}/work-requirements").json()
        assert any(x["bnb_id"] == STATE["wr_bnb"] for x in pub)
        # detail
        r2 = s.get(f"{API}/work-requirements/{STATE['wr_slug']}")
        assert r2.status_code == 200


# --------- Job apply_url conditional ---------
class TestJobApplicantUrl:
    def test_job_field_present_optional(self, s):
        jobs = s.get(f"{API}/jobs").json()
        assert isinstance(jobs, list)
        # Field may be present or missing/None - just ensure API returns
        for j in jobs[:5]:
            assert "bnb_id" in j


# --------- Resume privacy ---------
class TestResumePrivacy:
    def test_submit_resume(self, s):
        r = s.post(f"{API}/resumes", json={
            "full_name": "TEST_Resume User", "email": "resume@test.com",
            "preferred_role": "Site Engineer",
        })
        assert r.status_code == 200
        STATE["resume_bnb"] = r.json()["bnb_id"]
        assert STATE["resume_bnb"].startswith("BNB-R-")

    def test_resume_not_public_endpoints(self, s):
        # No GET /resumes public endpoint
        r = s.get(f"{API}/resumes")
        assert r.status_code in (404, 405)

    def test_resume_admin_lists(self, admin):
        items = admin.get(f"{API}/admin/resumes").json()
        assert any(x["bnb_id"] == STATE["resume_bnb"] for x in items)
        STATE["resume_id"] = next(x["id"] for x in items if x["bnb_id"] == STATE["resume_bnb"])

    def test_resume_admin_requires_auth(self, s):
        r = s.get(f"{API}/admin/resumes")
        assert r.status_code == 401


# --------- Vendor privacy ---------
class TestVendorPrivacy:
    def test_submit_vendor(self, s):
        r = s.post(f"{API}/vendors", json={
            "company_name": "TEST_Vendor Co", "email": "vendor@test.com",
            "service_categories": ["Electrical"],
        })
        assert r.status_code == 200
        STATE["vendor_bnb"] = r.json()["bnb_id"]
        assert STATE["vendor_bnb"].startswith("BNB-V-")

    def test_vendor_not_public_endpoints(self, s):
        r = s.get(f"{API}/vendors")
        assert r.status_code in (404, 405)

    def test_vendor_admin_lists(self, admin):
        items = admin.get(f"{API}/admin/vendors").json()
        assert any(x["bnb_id"] == STATE["vendor_bnb"] for x in items)
        STATE["vendor_id"] = next(x["id"] for x in items if x["bnb_id"] == STATE["vendor_bnb"])

    def test_vendor_admin_requires_auth(self, s):
        r = s.get(f"{API}/admin/vendors")
        assert r.status_code == 401


# --------- Excel Exports ---------
class TestExports:
    @pytest.mark.parametrize("module", ["jobs", "tenders", "work-requirements",
                                        "knowledge", "resumes", "vendors"])
    def test_export_xlsx(self, admin, module):
        r = admin.get(f"{API}/admin/export/{module}")
        assert r.status_code == 200, f"{module} -> {r.status_code} {r.text[:200]}"
        ct = r.headers.get("Content-Type", "")
        assert "spreadsheetml" in ct or "xlsx" in ct or "octet-stream" in ct, ct
        assert len(r.content) > 100

    def test_export_requires_auth(self, s):
        r = s.get(f"{API}/admin/export/jobs")
        assert r.status_code == 401


# --------- Cleanup ---------
class TestZCleanup:
    def test_cleanup(self, admin):
        # knowledge
        for k in admin.get(f"{API}/admin/knowledge").json():
            if (k.get("title") or "").startswith("TEST_KH_"):
                admin.delete(f"{API}/admin/knowledge/{k['id']}")
        for w in admin.get(f"{API}/admin/work-requirements").json():
            if (w.get("title") or "").startswith("TEST_WR_"):
                admin.delete(f"{API}/admin/work-requirements/{w['id']}")
        if STATE.get("resume_id"):
            admin.delete(f"{API}/admin/resumes/{STATE['resume_id']}")
        if STATE.get("vendor_id"):
            admin.delete(f"{API}/admin/vendors/{STATE['vendor_id']}")
