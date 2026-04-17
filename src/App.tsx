import { useState, useEffect, ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, 
  Code2, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Download, 
  ExternalLink, 
  Check, 
  Terminal,
  FileCode,
  Github
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// --- Components ---

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1.5 rounded-lg border border-white/10 bg-white/5 transition-colors group-hover:border-white/20">
            <Terminal className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Scraptory
          </span>
        </Link>

        <div className="flex items-center gap-6 text-xs font-semibold">
          <Link
            to="/"
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Archive
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
          >
            <Github className="w-3.5 h-3.5 text-neutral-400" />
          </a>
        </div>
      </div>
    </nav>
  );
}

// --- Pages ---

function Home() {
  interface Script {
    id: string;
    name: string;
    fileName: string;
    description: string;
    language: string;
    author: string;
  }

  const [scripts, setScripts] = useState<Script[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/scripts.json")
      .then((res) => res.json())
      .then((data) => {
        setScripts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load scripts", err);
        setLoading(false);
      });
  }, []);

  const filteredScripts = scripts.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
            Scraptory <span className="text-white/10">/</span>
          </h1>
          <p className="text-neutral-400 text-sm max-w-md">
            A collection of curated scraping scripts for developers and data enthusiasts.
          </p>
        </motion.div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search script archive..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 glass-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {filteredScripts.map((script) => (
            <motion.div
              key={script.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="group glass-card rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:border-white/30 transition-colors">
                    <Code2 className="w-5 h-5 text-white/70" />
                  </div>
                  <span className="text-[10px] font-mono border border-white/10 px-2 py-1 rounded bg-white/5 opacity-60">
                    {script.language}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1.5 transition-colors group-hover:text-white">
                  {script.name}
                </h3>
                <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                  {script.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                <span className="text-[10px] text-neutral-500 font-medium">
                  by {script.author}
                </span>
                <Link
                  to={`/view/${script.fileName}`}
                  className="flex items-center gap-1 text-[11px] font-bold tracking-wide hover:gap-1.5 transition-all text-neutral-300 hover:text-white"
                >
                  View Code <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && filteredScripts.length === 0 && (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 font-mono">No scripts found matching your search.</p>
        </div>
      )}
    </div>
  );
}

function ViewScript() {
  const { fileName } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [scriptData, setScriptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileName) return;

    setLoading(true);
    
    const fetchMetadata = fetch("/data/scripts.json")
      .then(res => res.json())
      .then(data => {
        const script = data.find((s: any) => s.fileName === fileName);
        setScriptData(script);
      });

    const fetchCode = fetch(`/scripts/${fileName}`)
      .then((res) => {
        if (!res.ok) throw new Error("Script not found");
        return res.text();
      });

    Promise.all([fetchMetadata, fetchCode])
      .then(([_, text]) => {
        setCode(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [fileName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = fileName || "script.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4 tracking-tight">Script Not Found <span className="text-white/10">—</span> 404</h1>
        <p className="text-neutral-500 mb-8 max-w-sm mx-auto">This script doesn't exist in our repository archives.</p>
        <button onClick={() => navigate("/")} className="btn-primary">
          Return to Archive
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-6 group text-xs font-medium">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        back to home
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 sticky top-24"
          >
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg w-fit mb-4">
              <FileCode className="w-5 h-5 text-neutral-300" />
            </div>
            <h1 className="text-xl font-bold mb-1 break-all">{fileName}</h1>
            <p className="text-[10px] text-neutral-500 mb-6 uppercase tracking-widest font-semibold">
              Source Payload
            </p>

            <div className="space-y-2.5">
              <button onClick={handleCopy} className="btn-primary w-full flex items-center justify-center gap-2 text-[11px] font-bold tracking-tight">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={handleDownload} className="btn-secondary w-full flex items-center justify-center gap-2 text-[11px] font-bold tracking-tight">
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              <a 
                href={`/raw/${fileName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full flex items-center justify-center gap-2 text-[11px] font-bold tracking-tight"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Raw
              </a>
            </div>
          </motion.div>
        </div>

        <div className="lg:w-3/4 space-y-6">
          {scriptData?.explanation && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6"
            >
              <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <div className="w-1 h-3 bg-white/20 rounded-full" />
                Penjelasan Script
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed font-medium">
                {scriptData.explanation}
              </p>
            </motion.div>
          )}

          <div className="glass-card rounded-2xl overflow-hidden border-white/5">
            <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02] border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/5" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/5" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/5" />
                </div>
                <span className="text-[10px] font-mono text-neutral-500 ml-3 hidden md:inline tracking-tight">
                  {fileName} — {loading ? "..." : `${code.split('\n').length} lines`}
                </span>
              </div>
              <Terminal className="w-3.5 h-3.5 text-white/10" />
            </div>

            <div className="relative">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 bg-white/5 rounded animate-pulse w-full" style={{ width: `${Math.random() * 40 + 60}%` }} />
                  ))}
                </div>
              ) : (
                <div className="text-[13px] font-mono scrollbar-thin scrollbar-thumb-white/10 overflow-hidden">
                  <SyntaxHighlighter
                    language={scriptData?.language?.toLowerCase() || "javascript"}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'transparent',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'inherit',
                      }
                    }}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Layout & App ---

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        {children}
      </div>
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
        </Routes>
      </MainLayout>
    </Router>
  );
}
