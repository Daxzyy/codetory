import { useState, useEffect, ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  Search, 
  ArrowLeft, 
  Copy, 
  Download, 
  ExternalLink, 
  Check, 
  FileCode,
  ChevronRight
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="border border-white/10 bg-white transition-colors group-hover:border-white/20 rounded-full overflow-hidden">
            <img
              src="/icon.png"
              className="w-9 h-9 rounded-full select-none pointer-events-none"
              alt="Scraptory Logo"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
          <span style={{ fontFamily: "'Martian Mono', monospace", fontWeight: 700, letterSpacing: '0.05em' }} className="text-xl text-white uppercase decoration-none">
            Scraptory
          </span>
        </Link>
      </div>
    </nav>
  );
}

function Home() {
  interface Script {
    id: string;
    name: string;
    fileName: string;
    explanation: string;
    language: string;
    author: string;
    date: string;
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <motion.div
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-xl font-bold tracking-tight mb-1 text-white font-pixel">
            Scraptory <span className="text-white/10">/</span>
          </h1>
          <p className="text-neutral-400 text-sm max-w-md leading-relaxed font-lexend tracking-tight">
            a collection of snippets, scripts, and tools for personal projects
          </p>
        </motion.div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search archive..."
            className="w-full bg-white/5 border border-white/10 rounded-none pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 border border-white/5 bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
        >
          {filteredScripts.map((script) => (
            <Link key={script.id} to={`/view/${script.fileName}`} className="group">
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="border border-white/10 bg-white/[0.02] p-5 h-full hover:bg-white/[0.05] hover:border-white/30 transition-all duration-300 flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="p-1 border border-white/10 bg-white/5 flex-shrink-0">
                      <FileCode className="w-4 h-4 text-white/40 group-hover:text-white/80" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white/80 group-hover:text-white tracking-tight leading-snug">
                        {script.name}
                      </h3>
                      {script.date && (
                        <span className="text-[9px] font-mono text-neutral-400">
                          {new Date(script.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono border border-white/5 px-2 py-0.5 bg-white/5 opacity-40 flex-shrink-0 uppercase ml-2">
                    {script.language}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3 flex-1">
                  <p className="text-xs text-neutral-400 font-medium leading-relaxed tracking-tight flex-1">
                    {script.explanation.length > 45 ? script.explanation.slice(0, 45) + '...' : script.explanation}
                  </p>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-all flex-shrink-0 mt-0.5" />
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}

      {!loading && filteredScripts.length === 0 && (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 font-mono text-sm">No scripts found matching your search.</p>
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
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) throw new Error("Script not found");
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors mb-4 group text-[10px] font-bold uppercase tracking-wider">
        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
        back to home
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/5">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-white/10 bg-white/[0.02] p-4 sticky top-20"
          >
            <div className="p-1.5 bg-white/5 border border-white/10 w-fit mb-3">
              <FileCode className="w-4 h-4 text-neutral-400" />
            </div>
            <h1 className="text-sm font-bold mb-0.5 break-all text-white/90">{fileName}</h1>

            {scriptData?.explanation && (
              <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-2">
                {scriptData.explanation}
              </p>
            )}

            {!loading && code && (
              <p className="text-[9px] text-neutral-400 font-mono tracking-tight mt-3">
                {new Blob([code]).size.toLocaleString()} bytes
                {scriptData?.date && (
                  <> · {new Date(scriptData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </p>
            )}
          </motion.div>
        </div>

        <div className="lg:w-4/5">
          <div className="border border-white/10 overflow-hidden" style={{ background: '#161616' }}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
              <span className="text-[9px] font-mono text-neutral-500 tracking-tight">
                {loading ? "..." : `${code.split('\n').length} lines`}
              </span>

              <div className="flex items-center gap-0">
                <a
                  href={`/raw/${fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 text-white/30 hover:text-white transition-all text-[10px] font-bold tracking-tight"
                >
                  <ExternalLink className="w-3 h-3" />
                  Raw
                </a>
                <span className="text-white/10 text-xs">|</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 text-white/30 hover:text-white transition-all text-[10px] font-bold tracking-tight"
                >
                  {copied ? <Check className="w-3 h-3 text-white/60" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <span className="text-white/10 text-xs">|</span>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1 text-white/30 hover:text-white transition-all text-[10px] font-bold tracking-tight"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            </div>

            <div className="relative">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-3 bg-white/5 animate-pulse w-full" style={{ width: `${Math.random() * 40 + 60}%` }} />
                  ))}
                </div>
              ) : (
                <div className="text-[11px] font-mono scrollbar-thin scrollbar-thumb-white/10 overflow-hidden">
                  <SyntaxHighlighter
                    language={scriptData?.language?.toLowerCase() || "javascript"}
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: 'transparent',
                      fontSize: 'inherit',
                      lineHeight: '1.4',
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
