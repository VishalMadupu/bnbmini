import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Layout = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-slate-50">
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default Layout;
