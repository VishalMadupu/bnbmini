export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Jammu & Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

export const COLLAR_TYPES = ["White Collar", "Blue Collar", "Both", "Not Specified"];

export const AUTHORITY_TYPES = [
  "Government", "PSU / Public Sector", "Municipal / Local Body",
  "Railway", "Private", "Other",
];

export const JOB_CATEGORIES = [
  "Site Engineering", "Project Management", "Architecture", "Design",
  "Safety / HSE", "Surveying", "MEP", "Skilled Labour", "Procurement",
  "Quantity Surveying", "Other",
];

export const TENDER_CATEGORIES = [
  "Roads & Highways", "Buildings", "Water & Sanitation", "Railways",
  "Bridges", "Irrigation", "Power", "Urban Infrastructure", "Other",
];

export const SOURCE_TYPES = [
  "BNB Research", "Public Website", "Company Submission",
  "Recruiter Submission", "Government Portal", "Organization Submission", "Other",
];

export const VERIFICATION_OPTIONS = [
  { value: "verified", label: "Verified Source" },
  { value: "no_badge", label: "No Badge" },
  { value: "rejected", label: "Rejected" },
];

export const STATUS_OPTIONS = ["draft", "pending", "active", "archived", "rejected"];

export const REQUIREMENT_TYPES = ["Contractor / Consultancy", "Workmen / Labour", "Material", "Machinery"];

export const SERVICE_CATEGORIES = {
  "Design & Engineering": ["Architect", "Structural Engineer", "Interior Designer", "Landscape Designer", "MEP Consultant", "Electrical Designer", "Plumbing Designer", "HVAC Designer", "BIM Modeler / Draftsman", "3D Visualizer"],
  "Liaisoning & Approvals": ["Liaisoning Consultant (GHMC/HMDA)", "Legal Consultant", "Surveyor (Land Survey)", "Town Planning Consultant"],
  "Execution (Technicians & Contractors)": ["Civil Works", "Labour Contractor", "Centring Contractor", "Piling Works", "Interior Works", "Demolition Works", "Waterproofing Works", "Electrician", "Plumbing", "HVAC", "Painter", "Flooring (Tiles, Granite)", "Roofing", "Carpenter", "False Ceiling"],
  "Material Suppliers": ["Cement & TMT", "Sand & Aggregates", "Bricks & Blocks", "Tiles & Granite", "Electrical Materials", "Plumbing Materials", "Paint Supplier", "Hardware Supplier", "Doors & Windows (Wood)", "UPVC Materials", "Plywood & False Ceiling"],
  "Specialized Services": ["QA/QC Labs", "Inspection Services", "Borewell", "Solar Panel Installer", "Lift / Elevator Supplier", "Fire Safety Systems", "CCTV & Security Systems"],
  "Equipment & Rentals": ["Machinery Rental (JCB, Excavators)", "Scaffolding Supplier"],
  "Other": ["Other"],
};
