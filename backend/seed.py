"""Seed BitsNdBricks with realistic Indian construction jobs & tenders."""
import requests

API = "http://localhost:8001/api"

JOBS = [
    {
        "title": "Senior Site Engineer", "organization": "Larsen & Toubro (L&T Construction)",
        "state": "Telangana", "city": "Hyderabad", "category": "Site Engineering",
        "description": "We are seeking an experienced Senior Site Engineer for a large commercial high-rise project in Hyderabad. Responsibilities include supervising site execution, quality control, coordinating with subcontractors, and ensuring adherence to project timelines and safety standards.\n\nRequirements:\n- B.E./B.Tech in Civil Engineering\n- 6-10 years of experience in high-rise construction\n- Strong knowledge of RCC, structural drawings and BOQ",
        "last_date": "2026-08-25", "applicant_email": "careers@lntecc.com",
        "applicant_phone": "+91 40 6789 1234", "applicant_url": "https://www.lntecc.com/careers",
        "source_type": "Public Website", "verification_status": "verified", "status": "active",
    },
    {
        "title": "Project Manager - Metro Rail", "organization": "Afcons Infrastructure Ltd",
        "state": "Maharashtra", "city": "Mumbai", "category": "Project Management",
        "description": "Lead the execution of an underground metro rail package. Manage a multidisciplinary team, oversee tunnelling operations, and interface with the client and consultants.\n\nRequirements:\n- 12+ years in metro/underground projects\n- PMP certification preferred",
        "last_date": "2026-09-10", "applicant_email": "hr@afcons.com",
        "applicant_url": "https://www.afcons.com/careers", "source_type": "Company Submission",
        "verification_status": "verified", "status": "active",
    },
    {
        "title": "Safety Officer (HSE)", "organization": "Shapoorji Pallonji & Co.",
        "state": "Karnataka", "city": "Bengaluru", "category": "Safety / HSE",
        "description": "Responsible for implementing HSE policies at an IT park construction site. Conduct safety audits, toolbox talks and incident investigations.\n\nRequirements:\n- Diploma/Degree with NEBOSH/IOSH\n- 4+ years site safety experience",
        "last_date": "2026-07-30", "applicant_email": "recruit@shapoorji.in",
        "applicant_phone": "+91 80 4123 5566", "source_type": "Recruiter Submission",
        "verification_status": "no_badge", "status": "active",
    },
    {
        "title": "Quantity Surveyor", "organization": "Tata Projects Ltd",
        "state": "Gujarat", "city": "Ahmedabad", "category": "Quantity Surveying",
        "description": "Prepare BOQs, verify subcontractor bills, manage variations and cost reports for an industrial plant project.\n\nRequirements:\n- B.E. Civil / Diploma\n- 5+ years QS experience with CANDY or similar",
        "last_date": "2026-08-05", "applicant_email": "careers@tataprojects.com",
        "applicant_url": "https://www.tataprojects.com/careers", "source_type": "Public Website",
        "verification_status": "verified", "status": "active",
    },
    {
        "title": "MEP Design Engineer", "organization": "Godrej Construction",
        "state": "Maharashtra", "city": "Pune", "category": "MEP",
        "description": "Design HVAC, electrical and plumbing systems for residential townships. Coordinate with architects and structural teams using Revit MEP.\n\nRequirements:\n- B.E. Mechanical/Electrical\n- 3-6 years MEP design experience",
        "last_date": "2026-09-01", "applicant_email": "jobs@godrej.com",
        "source_type": "Company Submission", "verification_status": "no_badge", "status": "active",
    },
    {
        "title": "Highway Construction Supervisor", "organization": "Dilip Buildcon Ltd",
        "state": "Madhya Pradesh", "city": "Bhopal", "category": "Site Engineering",
        "description": "Supervise earthwork, GSB, WMM and bituminous layers for a national highway package. Ensure compliance with MoRTH specifications.\n\nRequirements:\n- Diploma/B.E. Civil\n- 4+ years road construction experience",
        "last_date": "2026-08-18", "applicant_email": "hr@dilipbuildcon.com",
        "applicant_url": "https://dilipbuildcon.com/careers", "source_type": "Public Website",
        "verification_status": "verified", "status": "active",
    },
]

TENDERS = [
    {
        "title": "Construction of Government High School Building", "organization": "Public Health Engineering Dept, Govt of Telangana",
        "state": "Telangana", "city": "Nizamabad", "category": "Buildings",
        "description": "Tender for construction of a G+2 government high school building including classrooms, laboratories, toilets, water supply and electrical works. Work to be completed within 12 months from date of commencement.\n\nContractors must have Class-I registration and relevant experience in institutional building works.",
        "last_date": "2026-08-25", "estimated_value": "₹4.25 Crore",
        "original_reference": "EE/PH/2026/145", "official_url": "https://tender.telangana.gov.in",
        "contact_clarifications": "Executive Engineer, PH Division, Nizamabad — 08462-220145",
        "source_type": "Government Portal", "verification_status": "verified", "status": "active",
    },
    {
        "title": "Widening & Strengthening of State Highway SH-12", "organization": "National Highways Authority of India (NHAI)",
        "state": "Rajasthan", "city": "Jaipur", "category": "Roads & Highways",
        "description": "Four-laning of a 28 km stretch including construction of culverts, minor bridges, drainage and road furniture as per MoRTH specifications. EPC mode.\n\nBidders must meet financial and technical eligibility as per the detailed tender document.",
        "last_date": "2026-09-15", "estimated_value": "₹186 Crore",
        "original_reference": "NHAI/RJ/EPC/2026/0098", "official_url": "https://etender.nhai.gov.in",
        "contact_clarifications": "Project Director, NHAI PIU Jaipur",
        "source_type": "Government Portal", "verification_status": "verified", "status": "active",
    },
    {
        "title": "Construction of Municipal Water Treatment Plant", "organization": "Greater Chennai Corporation",
        "state": "Tamil Nadu", "city": "Chennai", "category": "Water & Sanitation",
        "description": "Design and construction of a 25 MLD water treatment plant including civil, mechanical and electrical works, commissioning and 5-year O&M.\n\nJoint ventures permitted subject to lead partner meeting criteria.",
        "last_date": "2026-08-30", "estimated_value": "₹62.5 Crore",
        "original_reference": "GCC/WS/2026/311", "official_url": "https://tenders.tn.gov.in",
        "source_type": "Government Portal", "verification_status": "verified", "status": "active",
    },
    {
        "title": "Construction of RCC Bridge across Godavari Tributary", "organization": "Roads & Buildings Dept, Govt of Maharashtra",
        "state": "Maharashtra", "city": "Nashik", "category": "Bridges",
        "description": "Construction of a 4-span RCC bridge with approach roads, protection works and river training. Contract period 18 months.\n\nOnly contractors with prior bridge experience of similar value may apply.",
        "last_date": "2026-09-05", "estimated_value": "₹18.9 Crore",
        "original_reference": "RB/NSK/BR/2026/077", "official_url": "https://mahatenders.gov.in",
        "source_type": "Government Portal", "verification_status": "no_badge", "status": "active",
    },
    {
        "title": "Development of Urban Public Park & Landscaping", "organization": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
        "state": "Karnataka", "city": "Bengaluru", "category": "Urban Infrastructure",
        "description": "Development of a 6-acre urban park including pathways, water features, children's play area, horticulture and lighting works.\n\nContractors with landscaping and civil experience preferred.",
        "last_date": "2026-08-12", "estimated_value": "₹9.75 Crore",
        "original_reference": "BBMP/HORT/2026/204", "official_url": "https://eproc.karnataka.gov.in",
        "source_type": "Government Portal", "verification_status": "verified", "status": "active",
    },
    {
        "title": "Construction of Irrigation Canal Lining Works", "organization": "Water Resources Dept, Govt of Uttar Pradesh",
        "state": "Uttar Pradesh", "city": "Lucknow", "category": "Irrigation",
        "description": "Cement concrete lining of a 15 km irrigation canal including desilting, structures and cross regulators to reduce seepage losses.\n\nWork under state minor irrigation programme.",
        "last_date": "2026-09-20", "estimated_value": "₹31.2 Crore",
        "original_reference": "WRD/UP/CANAL/2026/512", "official_url": "https://etender.up.nic.in",
        "source_type": "Government Portal", "verification_status": "verified", "status": "active",
    },
]


def main():
    for j in JOBS:
        r = requests.post(f"{API}/admin/jobs", json=j)
        print("JOB", r.status_code, r.json().get("bnb_id") if r.ok else r.text)
    for t in TENDERS:
        r = requests.post(f"{API}/admin/tenders", json=t)
        print("TENDER", r.status_code, r.json().get("bnb_id") if r.ok else r.text)


if __name__ == "__main__":
    main()
