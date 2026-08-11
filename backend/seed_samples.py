"""Seed 6 Work Requirements + 6 Knowledge Hub articles (rich text) via the admin API."""
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
BASE = "http://localhost:8001/api"
PWD = os.environ["ADMIN_PASSWORD"]

tok = requests.post(f"{BASE}/admin/login", json={"password": PWD}).json()["token"]
H = {"Authorization": f"Bearer {tok}"}


WORK_REQUIREMENTS = [
    {
        "requirement_type": "Contractor / Consultancy", "title": "RCC Structural Contractor for G+7 Residential Tower",
        "organization": "Skyline Developers Pvt Ltd", "state": "Telangana", "city": "Hyderabad",
        "quantity": "1 contractor (approx. 1,20,000 sq.ft built-up)",
        "description": "We are seeking an experienced RCC structural contractor for a G+7 residential project in Kokapet. Scope includes shuttering, reinforcement and concreting up to slab level. Contractor must have executed at least 3 similar high-rise projects and hold valid labour licences.",
        "required_by": "2026-08-15", "contact": "9848012345", "verification_status": "verified",
    },
    {
        "requirement_type": "Workmen / Labour", "title": "20 Skilled Bar-Benders & Steel Fixers Required",
        "organization": "Meghana Infra Contractors", "state": "Karnataka", "city": "Bengaluru",
        "quantity": "20 workers", "description": "Immediate requirement of 20 experienced bar-benders and steel fixers for a metro viaduct package. Accommodation and food provided at site. Minimum 3 years of experience on infrastructure projects preferred.",
        "required_by": "", "contact": "site.hr@meghanainfra.com", "verification_status": "no_badge",
    },
    {
        "requirement_type": "Material", "title": "500 MT TMT Steel Fe-550D Supply",
        "organization": "Coastal Constructions LLP", "state": "Andhra Pradesh", "city": "Visakhapatnam",
        "quantity": "500 MT", "description": "Requirement for 500 MT of Fe-550D TMT steel (mix of 12mm, 16mm and 25mm) delivered in phases over 3 months to our Gajuwaka site. Quote to include GST, freight and test certificates for each lot.",
        "required_by": "2026-07-30", "contact": "procurement@coastalconstructions.in", "verification_status": "verified",
    },
    {
        "requirement_type": "Machinery", "title": "2 Excavators (20-Ton) on Monthly Rental",
        "organization": "GreenField Earthworks", "state": "Maharashtra", "city": "Pune",
        "quantity": "2 excavators", "description": "Looking to hire two 20-ton class hydraulic excavators with operators on a monthly rental basis for a bulk earthwork and site-grading job near Hinjewadi. Fuel on our account; machines must be in good condition with valid documents.",
        "required_by": "2026-08-01", "contact": "9922011223", "verification_status": "no_badge",
    },
    {
        "requirement_type": "Contractor / Consultancy", "title": "MEP Consultant for Commercial Office Fit-Out",
        "organization": "Nexus Workspaces", "state": "Tamil Nadu", "city": "Chennai",
        "quantity": "1 consultancy (45,000 sq.ft)", "description": "We need an MEP design + supervision consultant for a 45,000 sq.ft Grade-A office fit-out in Guindy. Deliverables include HVAC, electrical, plumbing and fire-fighting design, BOQ, and periodic site inspection until handover.",
        "required_by": "2026-09-10", "contact": "projects@nexusworkspaces.com", "verification_status": "verified",
    },
    {
        "requirement_type": "Material", "title": "AAC Blocks & Ready-Mix Plaster Supply",
        "organization": "Sai Ram Builders", "state": "Telangana", "city": "Warangal",
        "quantity": "6,000 blocks + 40 MT plaster", "description": "Requirement of 6,000 AAC blocks (600x200x150mm) and 40 MT of ready-mix gypsum plaster for a villa community project. Suppliers offering bulk pricing and timely delivery to Warangal preferred.",
        "required_by": "", "contact": "9701122334", "verification_status": "no_badge",
    },
]


KNOWLEDGE = [
    {
        "content_type": "Article", "title": "Understanding GST for Construction Contractors in India",
        "summary": "A practical breakdown of GST rates, input tax credit and compliance every contractor should know before quoting a project.",
        "tags": ["GST", "Regulations", "Contracts"], "author_name": "CA Ramesh Iyer", "verification_status": "verified",
        "author_info": "Chartered Accountant advising infrastructure and real-estate firms for over 15 years.",
        "linkedin": "https://linkedin.com/in/ramesh-iyer",
        "content": """
<h2>GST rates that apply to construction</h2>
<p>Construction services in India are broadly taxed at <strong>18%</strong>, while affordable housing projects can attract concessional rates. Understanding which slab applies to your contract is the first step to pricing it correctly.</p>
<ul>
<li>Works contracts for government projects</li>
<li>Under-construction residential units</li>
<li>Commercial and industrial buildings</li>
</ul>
<h3>Input Tax Credit (ITC)</h3>
<p>ITC lets you offset the GST paid on cement, steel and services against your output liability. Maintain clean invoices — a single mismatched entry in GSTR-2B can block your credit.</p>
<table>
<tr><th>Item</th><th>Typical GST</th><th>ITC Eligible</th></tr>
<tr><td>Cement</td><td>28%</td><td>Yes</td></tr>
<tr><td>TMT Steel</td><td>18%</td><td>Yes</td></tr>
<tr><td>Works Contract</td><td>18%</td><td>Conditional</td></tr>
</table>
<blockquote>Tip: Reconcile your purchase register with GSTR-2B every month, not every quarter.</blockquote>
""",
    },
    {
        "content_type": "Construction Technology", "title": "How BIM Is Changing Project Delivery on Indian Sites",
        "summary": "Building Information Modelling is moving from big metros to mid-sized projects. Here is what it actually changes on the ground.",
        "tags": ["BIM", "Technology", "Project Management"], "author_name": "Ar. Sneha Kulkarni", "verification_status": "verified",
        "author_info": "Architect and BIM coordinator with experience across residential and commercial projects.",
        "linkedin": "https://linkedin.com/in/sneha-kulkarni",
        "content": """
<h2>From drawings to a shared 3D model</h2>
<p>BIM replaces disconnected 2D drawings with a single coordinated 3D model that everyone — architect, structural engineer, MEP and contractor — works from.</p>
<h3>Where it saves money</h3>
<ol>
<li><strong>Clash detection</strong> catches beam-vs-duct conflicts before they reach site.</li>
<li><strong>Quantity take-offs</strong> come straight from the model, reducing BOQ errors.</li>
<li><strong>4D scheduling</strong> links the model to the construction programme.</li>
</ol>
<p>The upfront effort is real, but rework on site is where projects usually bleed money — and that is exactly what a good model prevents.</p>
<blockquote>A clash caught in the model costs minutes; the same clash on site can cost weeks.</blockquote>
""",
    },
    {
        "content_type": "Industry News", "title": "New Labour Codes: What Site Managers Need to Prepare For",
        "summary": "The consolidation of India's labour laws into four codes affects wages, safety and working hours on every construction site.",
        "tags": ["Labour Laws", "Compliance", "Safety"], "author_name": "Adv. Priya Nair", "verification_status": "no_badge",
        "author_info": "Employment-law advocate focused on the construction and manufacturing sectors.",
        "linkedin": "https://linkedin.com/in/priya-nair",
        "content": """
<h2>The four codes at a glance</h2>
<p>India's 29 central labour laws are being consolidated into four codes covering <strong>Wages</strong>, <strong>Industrial Relations</strong>, <strong>Social Security</strong> and <strong>Occupational Safety</strong>.</p>
<ul>
<li>Standard definition of "wages" across benefits</li>
<li>Mandatory appointment letters for workers</li>
<li>Expanded social-security coverage for site labour</li>
</ul>
<h3>Action items for site managers</h3>
<p>Review your muster rolls, ensure PF/ESI registration for eligible workers, and update your safety committee documentation. Non-compliance penalties under the new codes are significantly higher.</p>
""",
    },
    {
        "content_type": "Article", "title": "A Site Engineer's Checklist for Quality Concrete Pours",
        "summary": "Simple, field-tested checks before, during and after a concrete pour that prevent honeycombing, cracks and rework.",
        "tags": ["Quality", "Concrete", "Best Practices"], "author_name": "Er. Vikram Reddy", "verification_status": "verified",
        "author_info": "Civil engineer with 12 years supervising high-rise and infrastructure concrete works.",
        "linkedin": "https://linkedin.com/in/vikram-reddy",
        "content": """
<h2>Before the pour</h2>
<ul>
<li>Check formwork alignment, tightness and de-shuttering oil.</li>
<li>Verify reinforcement cover using cover blocks — not guesswork.</li>
<li>Confirm slump at site against the approved mix design.</li>
</ul>
<h2>During the pour</h2>
<ol>
<li>Pour in layers of 300–450mm and vibrate each layer properly.</li>
<li>Avoid over-vibration, which causes segregation.</li>
<li>Take cube samples for every 50 cu.m or as specified.</li>
</ol>
<h2>After the pour</h2>
<p>Start curing within the initial setting time and continue for a minimum of 7 days. Curing is the single most neglected step — and the most common cause of surface cracks.</p>
<blockquote>Good concrete is 40% mix design and 60% site discipline.</blockquote>
""",
    },
    {
        "content_type": "Construction Technology", "title": "Prefab & Precast: Faster Builds Without Cutting Corners",
        "summary": "Why more Indian developers are turning to precast elements — and where prefab genuinely pays off.",
        "tags": ["Precast", "Technology", "Productivity"], "author_name": "Er. Anjali Menon", "verification_status": "no_badge",
        "author_info": "Structural engineer specialising in precast and industrialised building systems.",
        "linkedin": "https://linkedin.com/in/anjali-menon",
        "content": """
<h2>What precast actually delivers</h2>
<p>Precast shifts work from an uncertain site environment to a controlled factory, improving quality and speed.</p>
<table>
<tr><th>Metric</th><th>Conventional</th><th>Precast</th></tr>
<tr><td>Speed</td><td>Baseline</td><td>30–50% faster</td></tr>
<tr><td>Quality control</td><td>Site-dependent</td><td>Factory-controlled</td></tr>
<tr><td>Site labour</td><td>High</td><td>Lower</td></tr>
</table>
<h3>Where it pays off</h3>
<ul>
<li>Repetitive elements — columns, beams, façade panels.</li>
<li>Projects with tight timelines and good crane access.</li>
</ul>
<p>Precast is not a silver bullet: transport logistics and connection detailing must be planned early, or the savings evaporate.</p>
""",
    },
    {
        "content_type": "Industry News", "title": "Green Building Certifications: IGBC vs GRIHA Explained",
        "summary": "A quick comparison of India's two leading green-building rating systems and what each means for your project.",
        "tags": ["Sustainability", "Green Building", "Certification"], "author_name": "Ar. Karthik Rao", "verification_status": "verified",
        "author_info": "Sustainability consultant helping projects achieve IGBC and GRIHA ratings.",
        "linkedin": "https://linkedin.com/in/karthik-rao",
        "content": """
<h2>Two systems, one goal</h2>
<p>Both <strong>IGBC</strong> (Indian Green Building Council) and <strong>GRIHA</strong> (Green Rating for Integrated Habitat Assessment) reward energy efficiency, water conservation and healthier buildings.</p>
<table>
<tr><th>Aspect</th><th>IGBC</th><th>GRIHA</th></tr>
<tr><td>Origin</td><td>CII</td><td>TERI + MNRE</td></tr>
<tr><td>Focus</td><td>Broad building types</td><td>National priorities</td></tr>
<tr><td>Ratings</td><td>Certified to Platinum</td><td>1 to 5 Stars</td></tr>
</table>
<h3>Which should you choose?</h3>
<ul>
<li>Government projects often prefer GRIHA.</li>
<li>Commercial developers frequently choose IGBC for market recognition.</li>
</ul>
<p>Whichever you pick, engage the consultant at the design stage — retrofitting for certification is far more expensive.</p>
""",
    },
]


def main():
    for w in WORK_REQUIREMENTS:
        r = requests.post(f"{BASE}/admin/work-requirements", json=w, headers=H)
        print("WR ", r.json().get("bnb_id"), "-", w["title"][:45])
    for k in KNOWLEDGE:
        r = requests.post(f"{BASE}/admin/knowledge", json=k, headers=H)
        print("KH ", r.json().get("bnb_id"), "-", k["title"][:45])


if __name__ == "__main__":
    main()
