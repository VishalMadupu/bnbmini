import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Tenders from "@/pages/Tenders";
import TenderDetail from "@/pages/TenderDetail";
import WorkRequirements from "@/pages/WorkRequirements";
import WorkRequirementDetail from "@/pages/WorkRequirementDetail";
import Submit from "@/pages/Submit";
import SubmitHub from "@/pages/SubmitHub";
import WorkRequirementSubmit from "@/pages/WorkRequirementSubmit";
import ResumeSubmit from "@/pages/ResumeSubmit";
import VendorRegister from "@/pages/VendorRegister";
import Legal from "@/pages/Legal";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:slug" element={<JobDetail />} />
          <Route path="/tenders" element={<Tenders />} />
          <Route path="/tenders/:slug" element={<TenderDetail />} />
          <Route path="/work-requirements" element={<WorkRequirements />} />
          <Route path="/work-requirements/:slug" element={<WorkRequirementDetail />} />
          <Route path="/submit" element={<SubmitHub />} />
          <Route path="/submit/opportunity" element={<Submit />} />
          <Route path="/submit/work-requirement" element={<WorkRequirementSubmit />} />
          <Route path="/submit/resume" element={<ResumeSubmit />} />
          <Route path="/submit/vendor" element={<VendorRegister />} />
          <Route path="/privacy" element={<Legal page="privacy" />} />
          <Route path="/disclaimer" element={<Legal page="disclaimer" />} />
          <Route path="/terms" element={<Legal page="terms" />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
