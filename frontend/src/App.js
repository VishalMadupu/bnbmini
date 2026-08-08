import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Tenders from "@/pages/Tenders";
import TenderDetail from "@/pages/TenderDetail";
import Submit from "@/pages/Submit";
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
          <Route path="/submit" element={<Submit />} />
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
