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

## Next Tasks
- Phase 2: Knowledge Hub with TipTap rich-text editor (content types, tags, source URL, author, declaration, `BNB-K-...`, no auto-expiry).
- Run full testing agent across new modules.
- Add admin auth when moving beyond demo.
- Generate sitemap + robots for indexing.
