"""Iteration 5 tests: Universal BNB ID, Admin Dashboard stats, Private status,
Private data isolation, Excel exports (6 modules), Knowledge new fields."""
import io
import os
import re
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

BNB_RE = re.compile(r"^BNB-\d{6}$")


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture(scope="module")
def anon():
    return requests.Session()


# ---------- Universal BNB ID format ----------
class TestUniversalBnbFormat:
    def test_jobs_have_universal_id_and_record_type(self, admin):
        docs = admin.get(f"{API}/admin/jobs").json()
        assert len(docs) >= 1
        for d in docs:
            assert BNB_RE.match(d["bnb_id"]), f"bad id {d['bnb_id']}"
            assert d.get("record_type") == "Job"

    def test_tenders_have_universal_id(self, admin):
        for d in admin.get(f"{API}/admin/tenders").json():
            assert BNB_RE.match(d["bnb_id"])
            assert d.get("record_type") == "Tender"

    def test_wr_have_universal_id(self, admin):
        for d in admin.get(f"{API}/admin/work-requirements").json():
            assert BNB_RE.match(d["bnb_id"])
            assert d.get("record_type") == "Work Requirement"

    def test_knowledge_have_universal_id(self, admin):
        for d in admin.get(f"{API}/admin/knowledge").json():
            assert BNB_RE.match(d["bnb_id"])
            assert d.get("record_type") == "Knowledge Hub"

    def test_public_jobs_universal(self, anon):
        for d in anon.get(f"{API}/jobs").json():
            assert BNB_RE.match(d["bnb_id"])
            # public_view strips origin
            assert "origin" not in d

    def test_public_tenders_universal(self, anon):
        for d in anon.get(f"{API}/tenders").json():
            assert BNB_RE.match(d["bnb_id"])

    def test_public_wr_universal(self, anon):
        for d in anon.get(f"{API}/work-requirements").json():
            assert BNB_RE.match(d["bnb_id"])

    def test_public_knowledge_universal(self, anon):
        for d in anon.get(f"{API}/knowledge").json():
            assert BNB_RE.match(d["bnb_id"])


# ---------- Universal counter increments across modules ----------
class TestUniversalCounter:
    def _seq(self, bnb):
        return int(bnb.split("-")[1])

    def test_sequence_shared_across_modules(self, anon):
        ids = []
        # job public submit
        r = anon.post(f"{API}/submissions", json={"kind": "job", "title": "TEST_UBI_job"})
        assert r.status_code == 200
        ids.append(r.json()["bnb_id"])
        # tender
        r = anon.post(f"{API}/submissions", json={"kind": "tender", "title": "TEST_UBI_tender"})
        assert r.status_code == 200
        ids.append(r.json()["bnb_id"])
        # work-requirement
        r = anon.post(f"{API}/submissions/work-requirement",
                      json={"requirement_type": "Material", "title": "TEST_UBI_wr",
                            "state": "Delhi", "city": "New Delhi",
                            "quantity": "1", "contact": "9876543210",
                            "submitter_name": "T", "declaration": True})
        assert r.status_code == 200, r.text
        ids.append(r.json()["bnb_id"])
        # knowledge
        r = anon.post(f"{API}/submissions/knowledge",
                      json={"title": "TEST_UBI_kh", "content": "<p>hi</p>",
                            "author_name": "T", "content_type": "Article",
                            "declaration": True})
        assert r.status_code == 200, r.text
        ids.append(r.json()["bnb_id"])
        # resume
        r = anon.post(f"{API}/resumes",
                      json={"full_name": "TEST_UBI res", "email": "a@b.com",
                            "phone": "9876543210", "declaration": True})
        assert r.status_code == 200, r.text
        ids.append(r.json()["bnb_id"])
        # vendor
        r = anon.post(f"{API}/vendors",
                      json={"company_name": "TEST_UBI vendor",
                            "contact_person": "T", "email": "a@b.com",
                            "phone": "9876543210", "declaration": True})
        assert r.status_code == 200, r.text
        ids.append(r.json()["bnb_id"])

        # All match universal format
        for b in ids:
            assert BNB_RE.match(b), f"bad {b}"
        seqs = [self._seq(b) for b in ids]
        # Strictly increasing across modules (universal shared counter)
        assert seqs == sorted(seqs), f"not increasing: {seqs}"
        assert len(set(seqs)) == len(seqs), "duplicates present"
        # And step of exactly 1 between successive (no gaps within one atomic test window)
        for a, b in zip(seqs, seqs[1:]):
            assert b == a + 1, f"gap {a}->{b}"
        pytest.ubi_ids = ids  # store for cleanup


# ---------- Admin Dashboard ----------
class TestAdminStats:
    def test_stats_shape(self, admin):
        r = admin.get(f"{API}/admin/stats")
        assert r.status_code == 200
        data = r.json()
        assert "public" in data and "private" in data
        for k in ["jobs", "tenders", "work-requirements", "knowledge"]:
            assert k in data["public"], f"missing {k}"
            row = data["public"][k]
            for f in ["total", "pending", "published", "archived", "bnb_created", "public_submissions"]:
                assert f in row and isinstance(row[f], int)
        for k in ["resumes", "vendors"]:
            assert k in data["private"]
            row = data["private"][k]
            for f in ["total", "new_pending", "reviewed", "archived"]:
                assert f in row

    def test_stats_requires_auth(self, anon):
        assert anon.get(f"{API}/admin/stats").status_code == 401


# ---------- Private status actions ----------
class TestPrivateStatusActions:
    def test_resume_status_flow(self, admin, anon):
        r = anon.post(f"{API}/resumes",
                      json={"full_name": "TEST_status resume", "email": "s@t.com",
                            "phone": "9876543210", "declaration": True})
        assert r.status_code == 200
        bnb = r.json()["bnb_id"]
        # Find id
        docs = admin.get(f"{API}/admin/resumes").json()
        rid = next(d["id"] for d in docs if d["bnb_id"] == bnb)
        # Mark reviewed
        p = admin.patch(f"{API}/admin/resumes/{rid}/status", json={"status": "reviewed"})
        assert p.status_code == 200
        assert p.json()["status"] == "reviewed"
        # Archive
        p = admin.patch(f"{API}/admin/resumes/{rid}/status", json={"status": "archived"})
        assert p.status_code == 200 and p.json()["status"] == "archived"
        # cleanup
        admin.delete(f"{API}/admin/resumes/{rid}")

    def test_vendor_status_flow(self, admin, anon):
        r = anon.post(f"{API}/vendors",
                      json={"company_name": "TEST_status vendor",
                            "contact_person": "T", "email": "v@t.com",
                            "phone": "9876543210", "declaration": True})
        assert r.status_code == 200
        bnb = r.json()["bnb_id"]
        docs = admin.get(f"{API}/admin/vendors").json()
        vid = next(d["id"] for d in docs if d["bnb_id"] == bnb)
        for st in ["reviewed", "archived", "new"]:
            p = admin.patch(f"{API}/admin/vendors/{vid}/status", json={"status": st})
            assert p.status_code == 200 and p.json()["status"] == st
        admin.delete(f"{API}/admin/vendors/{vid}")

    def test_status_requires_auth(self, anon):
        r = anon.patch(f"{API}/admin/resumes/xxx/status", json={"status": "reviewed"})
        assert r.status_code == 401
        r = anon.patch(f"{API}/admin/vendors/xxx/status", json={"status": "reviewed"})
        assert r.status_code == 401

    def test_invalid_status_rejected(self, admin):
        r = admin.patch(f"{API}/admin/resumes/xxx/status", json={"status": "bogus"})
        assert r.status_code == 422


# ---------- Private data isolation ----------
class TestPrivateIsolation:
    def test_no_public_resumes_list(self, anon):
        r = anon.get(f"{API}/resumes")
        assert r.status_code in (404, 405)

    def test_no_public_vendors_list(self, anon):
        r = anon.get(f"{API}/vendors")
        assert r.status_code in (404, 405)

    def test_knowledge_public_strips_author_contact(self, admin, anon):
        # Create knowledge with author_contact then publish
        payload = {"title": "TEST_iso_kh", "content_type": "Article",
                   "summary": "s", "content": "<p>x</p>",
                   "tags": ["test"], "author_name": "A",
                   "linkedin": "https://linkedin.com/in/x",
                   "author_contact": "PRIVATE_9876543210",
                   "declaration": True, "status": "active"}
        r = admin.post(f"{API}/admin/knowledge", json=payload)
        assert r.status_code == 200
        doc = r.json()
        try:
            pub = anon.get(f"{API}/knowledge/{doc['slug']}").json()
            assert "author_contact" not in pub, "author_contact leaked to public"
            assert "origin" not in pub
            # linkedin should be exposed (public field)
            assert pub.get("linkedin") == "https://linkedin.com/in/x"
        finally:
            admin.delete(f"{API}/admin/knowledge/{doc['id']}")


# ---------- Excel exports ----------
class TestExcelExports:
    @pytest.mark.parametrize("module", ["jobs", "tenders", "work-requirements",
                                        "knowledge", "resumes", "vendors"])
    def test_export_xlsx(self, admin, module):
        r = admin.get(f"{API}/admin/export/{module}")
        assert r.status_code == 200, f"{module}: {r.status_code}"
        ct = r.headers.get("Content-Type", "")
        assert "sheet" in ct or "excel" in ct or "openxml" in ct, ct
        # xlsx magic bytes = PK zip
        assert r.content[:2] == b"PK", "not a zip/xlsx"

    def test_export_requires_auth(self, anon):
        r = anon.get(f"{API}/admin/export/jobs")
        assert r.status_code == 401


# ---------- Knowledge new fields ----------
class TestKnowledgeNewFields:
    def test_submit_knowledge_with_new_fields(self, anon, admin):
        payload = {
            "title": "TEST_KH_new_fields",
            "content_type": "Construction Technology",
            "summary": "s",
            "content": "<p>body</p>",
            "tags": ["tech"],
            "author_name": "Alice",
            "linkedin": "https://linkedin.com/in/alice",
            "author_contact": "alice@example.com",
            "declaration": True,
        }
        r = anon.post(f"{API}/submissions/knowledge", json=payload)
        assert r.status_code == 200, r.text
        bnb = r.json()["bnb_id"]
        assert BNB_RE.match(bnb)
        # Confirm stored on admin side
        docs = admin.get(f"{API}/admin/knowledge").json()
        d = next((x for x in docs if x["bnb_id"] == bnb), None)
        assert d is not None
        assert d["content_type"] == "Construction Technology"
        assert d["linkedin"] == "https://linkedin.com/in/alice"
        assert d["author_contact"] == "alice@example.com"
        assert d.get("origin") == "Public Submission"
        assert d.get("status") == "pending"
        # cleanup
        admin.delete(f"{API}/admin/knowledge/{d['id']}")

    def test_submit_knowledge_missing_declaration(self, anon):
        r = anon.post(f"{API}/submissions/knowledge",
                      json={"title": "x", "content": "<p>y</p>", "declaration": False})
        assert r.status_code == 422


# ---------- Cleanup ----------
class TestZCleanup:
    def test_cleanup(self, admin):
        for coll in ["jobs", "tenders", "work_requirements", "knowledge"]:
            key = "work-requirements" if coll == "work_requirements" else coll
            docs = admin.get(f"{API}/admin/{key}").json()
            for d in docs:
                t = (d.get("title") or "").upper()
                if t.startswith("TEST_UBI") or t.startswith("TEST_ISO") or t.startswith("TEST_KH_NEW") or t.startswith("TEST_STATUS"):
                    admin.delete(f"{API}/admin/{key}/{d['id']}")
        for coll in ["resumes", "vendors"]:
            docs = admin.get(f"{API}/admin/{coll}").json()
            for d in docs:
                name = (d.get("full_name") or d.get("company_name") or "").upper()
                if "TEST_UBI" in name or "TEST_STATUS" in name:
                    admin.delete(f"{API}/admin/{coll}/{d['id']}")
