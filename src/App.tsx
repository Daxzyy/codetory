import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, ReactNode } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ViewScript from "./pages/ViewScript";
import RawScript from "./pages/RawScript";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isRaw = location.pathname.startsWith("/raw");

  if (isRaw) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="border-t border-white/5 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-neutral-500 text-xs font-medium">
          <p>© 2026 Scraptory</p>
          <p>Built by <span className="text-neutral-300">Givy</span></p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/view/:fileName" element={<ViewScript />} />
          <Route path="/raw/:fileName" element={<RawScript />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
