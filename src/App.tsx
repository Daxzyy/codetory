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
  ChevronRight,
  Plus,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const LARGE_FILE_THRESHOLD = 200 * 1024;
const LINES_PER_CHUNK = 100;
const PREVIEW_LINES = 30;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncate(str: string, max: number): string {
  const chars = [...str];
  if (chars.length <= max) return str;
  return chars.slice(0, max).join('') + '...';
}

function LangIcon({ language, className = "w-4 h-4" }: { language?: string; className?: string }) {
  const lang = (language || "").toLowerCase();
  const map: Record<string, string> = {
    javascript: "/file-js.svg",
    typescript: "/file-ts.svg",
    python: "/file-py.svg",
  };
  const src = map[lang];
  if (src) {
    return <img src={src} alt={lang} className={className} draggable={false} />;
  }
  return <FileCode className={`${className} text-white/40`} />;
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center group -ml-3">
          <img src="/codetory.svg" alt="Codetory" className="h-20 w-auto" draggable={false} />
        </Link>
      </div>
    </nav>
  );
}

function LargeFileViewer({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n');
  const [visibleCount, setVisibleCount] = useState(PREVIEW_LINES);
  const isFullyExpanded = visibleCount >= lines.length;

  const visibleCode = lines.slice(0, visibleCount).join('\n');

  return (
    <div>
      <div className="text-[11px] font-mono overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: 'inherit',
            lineHeight: '1.4',
          }}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
          showLineNumbers
          startingLineNumber={1}
        >
          {visibleCode}
        </SyntaxHighlighter>
      </div>

      {!isFullyExpanded && (
        <button
          onClick={() => setVisibleCount(c => Math.min(c + LINES_PER_CHUNK, lines.length))}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-white/5 bg-white/[0.015] hover:bg-white/[0.04] text-white/30 hover:text-white/70 transition-all group"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-90 group-hover:translate-y-0.5 transition-transform" />
          <span className="text-[10px] font-mono">{lines.length - visibleCount} more lines</span>
          <ChevronRight className="w-3.5 h-3.5 rotate-90 group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
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
    fetch("https://raw.githubusercontent.com/Daxzyy/codetory/main/public/data/scripts.json")
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
            <span className="text-white/40">givy's</span> <span className="text-white/10">/</span> codetory
          </h1>
          <p className="text-neutral-400 text-sm max-w-md leading-relaxed font-lexend tracking-tight">
            a collection of snippets, scripts, and tools for personal projects
          </p>
        </motion.div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search snippets..."
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
                    <div className="p-0.5 border border-white/10 bg-white/5 flex-shrink-0">
                      <LangIcon language={script.language} className="w-5 h-5" />
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
                    {truncate(script.explanation, 45)}
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
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    if (!fileName) return;

    setLoading(true);
    setIsLarge(false);

    const fetchMetadata = fetch("https://raw.githubusercontent.com/Daxzyy/codetory/main/public/data/scripts.json")
      .then(res => res.json())
      .then(data => {
        const script = data.find((s: any) => s.fileName === fileName);
        setScriptData(script);
      });

    const fetchCode = fetch(`https://raw.githubusercontent.com/Daxzyy/codetory/main/public/scripts/${fileName}`)
      .then((res) => {
        if (!res.ok) throw new Error("Script not found");
        return res.text();
      });

    Promise.all([fetchMetadata, fetchCode])
      .then(([_, text]) => {
        const byteSize = new Blob([text]).size;
        setIsLarge(byteSize > LARGE_FILE_THRESHOLD);
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
              <LangIcon language={scriptData?.language} className="w-5 h-5" />
            </div>
            <h1 className="text-sm font-bold mb-0.5 break-all text-white/90">{fileName}</h1>

            {scriptData?.explanation && (
              <p className="text-xs text-neutral-400 font-medium leading-relaxed mt-2">
                {scriptData.explanation}
              </p>
            )}

            {!loading && code && (
              <p className="text-[10px] text-neutral-400 font-mono tracking-tight mt-3">
                {formatSize(new Blob([code]).size)}
                {scriptData?.date && (
                  <> · {new Date(scriptData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </p>
            )}

            {!loading && isLarge && (
              <div className="mt-3 px-2 py-1.5 bg-yellow-500/5 border border-yellow-500/20 text-[10px] font-mono text-yellow-400/70">
                large file · chunked view
              </div>
            )}
          </motion.div>
        </div>

        <div className="lg:w-4/5">
          <div className="border border-white/10 rounded-lg overflow-hidden" style={{ background: '#161616' }}>
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-b border-white/5">
              <span className="text-[9px] font-mono text-neutral-500 tracking-tight">
                {loading ? "..." : `${code.split('\n').length} lines`}
              </span>

              <div className="flex items-center gap-0">
                <a
                  href={"/raw/" + fileName}
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
              ) : isLarge ? (
                <LargeFileViewer
                  code={code}
                  language={scriptData?.language?.toLowerCase() || "text"}
                />
              ) : (
                <div className="text-[11px] font-mono overflow-hidden">
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
                    codeTagProps={{ style: { fontFamily: 'inherit' } }}
                    showLineNumbers
                    startingLineNumber={1}
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

function Submit() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    fileName: "",
    language: "JavaScript",
    explanation: "",
    code: "",
    author: "Givy",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setAuthError(true);
      }
    } catch {
      setAuthError(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.fileName || !form.code) {
      setErrorMsg("Name, fileName, and code are required.");
      setStatus("error");
      return;
    }

    const fileName = form.fileName.endsWith(".js") || form.fileName.endsWith(".py") || form.fileName.endsWith(".ts") || form.fileName.endsWith(".json")
      ? form.fileName
      : `${form.fileName}.js`;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fileName, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setStatus("success");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors mb-6 group text-[10px] font-bold uppercase tracking-wider">
        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
        back to home
      </Link>

      {!authed ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-16"
        >
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <h1 className="text-lg font-bold text-white font-pixel">Password</h1>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAuth()}
                placeholder="Enter password..."
                className="w-full bg-white/5 border border-white/10 px-3 py-2 pr-9 text-sm text-white focus:outline-none focus:border-white/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {authError && <p className="text-red-400 text-xs font-mono">Wrong password.</p>}
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="px-4 py-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</> : "Enter"}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-lg font-bold text-white mb-1 font-pixel">Add Script</h1>
          <p className="text-neutral-400 text-xs mb-6 font-lexend">Tambah script baru ke Codetory</p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Catbox Uploader"
                className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">File Name</label>
              <input
                name="fileName"
                value={form.fileName}
                onChange={handleChange}
                placeholder="catbox.js"
                className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Language</label>
              <div className="relative">
                <select
                  name="language"
                  value={form.language}
                  onChange={handleChange}
                  className="w-full appearance-none bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all pr-8"
                >
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="Python">Python</option>
                  <option value="JSON">JSON</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Explanation</label>
              <textarea
                name="explanation"
                value={form.explanation}
                onChange={handleChange}
                placeholder="Script ini berfungsi untuk..."
                rows={3}
                className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Code</label>
              <textarea
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="const x = ..."
                rows={12}
                className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-all resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-red-400 text-xs font-mono">{errorMsg}</p>
            )}

            {status === "success" && (
              <p className="text-green-400 text-xs font-mono">Script berhasil ditambahkan! Redirecting...</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={status === "loading" || status === "success"}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><Plus className="w-4 h-4" /> Submit Script</>
              )}
            </button>
          </div>
        </motion.div>
      )}
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
          <p>© 2026 Codetory</p>
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
          <Route path="/submit" element={<Submit />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
