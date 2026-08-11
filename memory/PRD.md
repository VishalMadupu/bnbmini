# BitsNdBricks — Product Requirements Document

## Original Problem Statement
Build BitsNdBricks Phase 1: a lean, clean, mobile-first construction opportunity discovery platform for India, focused ONLY on Construction **Jobs** and **Tenders**. No registration, no login for visitors, no payments, no marketplace. Visitor journey: Land → Search → Find → View → Apply/Contact. Architecture must be future-proof for later sections (vendors, materials, news, etc.) without prominent Phase-1 exposure.

## User Choices
- Admin: no auth, hidden `/admin` route
- File attachments: real uploads via Emergent object storage
- Seed realistic Indian-context sample data
- Theme: light, clean & professional (chosen palette: slate-900 + safety orange)

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). Collections: `jobs`, `tenders`, `files`, `counters`. All routes under `/api`.
- **Frontend**: React 19 + Tailwind + shadcn/ui. Routes: `/`, `/jobs`, `/jobs/:slug`, `/tenders`, `/tenders/:slug`, `/submit`, `/privacy`, `/disclaimer`, `/terms`, `/admin`.
- **Storage**: Emergent object storage for uploads; DB stores file refs, served via `/api/files/{id}`.
- Future-proof: shared listing shape, source_type/verification_status separation, reusable card/detail components.

## Core Requirements (static)
- Unique permanent IDs: `BNB-J-YYYY-00001`, `BNB-T-YYYY-00001` (sequential via counters).
- Source Type (internal) vs Verification Status (verified/no_badge/rejected). Public shows "✓ Verified Source" only when verified; never negative labels.
- Direct BNB posts publish immediately; external submissions go to `pending` for admin review.
- Auto-archive: expiry = last_date, else posted+14 days. Archived kept, accessible via direct URL.
- SEO: per-listing title/meta/canonical/OG + JobPosting JSON-LD; slug+ID URLs.
- Public API strips submitter info and source_type.

## Implemented (2026-08-08 — MVP complete)
- Homepage: hero + prominent search, Find Jobs/Tenders, Latest Jobs & Tenders, submission CTA, footer legal links.
- Jobs & Tenders listing pages with search + State/City/Category filters.
- Job & Tender SEO detail pages with Apply Now / Official Tender Portal CTAs, attachment download.
- Public `/submit` (Job/Tender toggle) with file upload; creates pending listing; success message.
- Hidden `/admin`: CRUD, status transitions (publish/archive/reject), verification toggle, submitter viewer, file upload.
- Legal pages: Privacy, Disclaimer, Terms.
- Seeded 6 jobs + 6 tenders (L&T, NHAI, Afcons, Shapoorji Pallonji, Tata Projects, BBMP, etc.).
- Tested: 22/22 backend pytest passed; frontend flows verified 100%.

## Backlog (future phases)
- **P1**: Admin authentication (currently open hidden route); pagination; email notification on submission.
- **P2**: Vendors, Materials, Machinery, Workforce, Knowledge Hub, News, Students Corner, Professional Profiles.
- **P2**: Saved searches, alerts, sitemap.xml generation, richer structured data for tenders.

## Implemented (2026-08-08 — Iteration 3)
- Full responsive/cross-browser pass: mobile hamburger menu (Sheet), single-column forms on mobile with 2-col desktop pairings, detail pages reflow (key info before description on mobile), text-based Expired/Open status, break-words on all titles, zero horizontal overflow verified at 320/390/768/1024/1440/1920.
- Admin: pending-submissions count badge in header; bulk approve/reject of inbox submissions via checkboxes; admin table horizontally scrollable within its container on small screens.
- Verified: iteration_3 frontend tests 100% pass; a11y warning on mobile Sheet fixed.

## Implemented (Phase 1 expansion)
- **Work Requirements** module: public listing `/work-requirements` + SEO detail, submission `/submit/work-requirement`, admin CRUD/publish/verify/archive/reject, ID `BNB-WR-...`, expiry (required_by or +14d), contact validated as 10-digit mobile OR email.
- **Resume submission** (`/submit/resume`, private, `BNB-R-...`) and **Vendor Registration** (`/submit/vendor`, private, `BNB-V-...`, grouped service-category accordion + serviceable-locations multiselect) with required declarations.
- **Submit hub** at `/submit` linking to Job/Tender, Work Requirement, Resume, Vendor. Nav adds Work Requirements.
- **Admin** extended: tabs for Work Req., Resumes, Vendors; inbox now includes WR pending; **per-module Excel export** (openpyxl) with current status/state filter; private record viewer.
- Public/private separation preserved (submitter, source_type, resumes, vendors never public).

## Implemented (Phase 2 — 2026-06-11)
- **Knowledge Hub** module: public listing `/knowledge-hub` (hero, search + topic/tag filter), SEO detail `/knowledge-hub/:slug` (Article JSON-LD, rich HTML render, author bio, attachment/source links), contribution form `/submit/knowledge`.
- **TipTap 3 rich-text editor** (`RichTextEditor.jsx`): bold/italic/underline/strike, H2/H3, lists, blockquote, links, in-editor image upload (via `/api/upload`), tables; supports pasting formatted content from Word/Google Docs.
- Fields: title, summary, content (HTML), tags (comma-separated), cover image, attachment, source URL, author name/info, **mandatory declaration checkbox**. ID `BNB-K-YYYY-00001`, **no auto-expiry**.
- Backend: `GET /api/knowledge`, `GET /api/knowledge/{slug}` (slug or BNB-id), `POST /api/submissions/knowledge` (validates declaration + non-empty content → pending), admin CRUD `/api/admin/knowledge` (+ `/status`), export `/api/admin/export/knowledge`, `meta.knowledge_tags`, sitemap includes knowledge URLs.
- **Admin**: new Knowledge tab + `KnowledgeEditor` (rich editor) for create/edit/publish/verify; status filter (`admin-status-filter`) applies.
- **Homepage**: "Latest Work Requirements" strip (`view-all-wr`) shows up to 3 active WRs.
- **JobDetail**: Apply Now button only renders when `applicant_url` is present (no dead clicks) — verified.
- Tested: iteration_4 — backend 54/54 pytest pass; frontend 100% of testable flows (Knowledge submit/publish/detail, declaration validation, admin exports, homepage strip, private data isolation).

## Implemented (Enhancement Round — 2026-06-11)
- **Universal BNB ID**: single continuous sequence `BNB-000001`, `BNB-000002`… shared across ALL 6 modules (atomic `counters.bnb_universal`, never resets). `record_type` stored separately; `origin` = "BNB Created" | "Public Submission". Existing 22 records renumbered via `migrate_ids.py`. IDs/slugs updated everywhere; `ID_REGEX = bnb-\d{6}`.
- **Consolidated Admin Dashboard** (default tab): per-module summary cards — Public (Total, Pending, Published, Archived, BNB Created, Public Submissions) and Private (Total, New/Pending, Reviewed, Archived) with clickable stat tiles that jump to filtered lists. Backend: `GET /api/admin/stats`.
- **Admin Complete-Record View**: `FullRecordDialog` shows every stored field, dates, contacts, URLs, arrays, attachments (download), and full rendered rich-text for Knowledge — for all modules.
- **Private status workflow**: Resume/Vendor rows show Status + Mark-reviewed/Archive actions. Backend: `PATCH /api/admin/resumes|vendors/{id}/status` (new/reviewed/archived).
- **Knowledge Hub additions**: Content Type (Article / Construction Technology / Industry News), LinkedIn, Profile Picture, private Contact; image captions in editor; exact declaration text. Public shows Content Type badge + author LinkedIn/photo; `author_contact` stripped from public.
- **Jobs/Tenders UX**: clearer grouping + helper texts; applicant/respondent contact validated as 10-digit Indian mobile OR email when provided.
- **Vendor**: "All India" option in serviceable locations.
- **Exports**: all 6 modules; `record_type`/`origin` added; Knowledge adds `content_type`/`linkedin`.
- Tested: iteration_5 — backend 82/82 pytest pass, frontend 100% of critical flows, no product bugs. Regression suite: `/app/backend/tests/test_universal_bnb.py`.

## Next Tasks / Backlog
- **P2**: Vendor Directory — searchable public directory of approved vendors (deferred, user: "later").
- **P1**: Real admin authentication before going live (currently password-gated demo).
- Refactor: `server.py` (~1160 lines) — consider splitting into routes/models/helpers/exports modules.
- Optional a11y: add DialogDescription to admin dialogs (non-functional warning).
