import { useState, useEffect, ReactNode, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, ArrowLeft, Copy, Download, ExternalLink, Check, FileCode,
  ChevronRight, Plus, Loader2, Eye, EyeOff, FilePlus, Pencil, Trash2, X, ChevronDown
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { decryptData } from "./lib/crypto";

const LARGE_FILE_THRESHOLD = 200 * 1024;
const LINES_PER_CHUNK = 100;
const PREVIEW_LINES = 30;
const SESSION_DURATION = 10 * 60 * 1000;
const SESSION_KEY = "codetory_session_expiry";

const EXT_MAP: Record<string, string> = {
  JavaScript: ".js",
  TypeScript: ".ts",
  Python: ".py",
  JSON: ".json",
};

function getExt(language: string): string {
  return EXT_MAP[language] || ".js";
}

function stripExt(fileName: string): string {
  return fileName.replace(/\.(js|ts|py|json)$/, "");
}

function getSessionExpiry(): number | null {
  try {
    const val = localStorage.getItem(SESSION_KEY);
    if (!val) return null;
    const expiry = parseInt(val, 10);
    if (isNaN(expiry)) return null;
    return expiry;
  } catch {
    return null;
  }
}

function setSessionExpiry(): void {
  try {
    localStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_DURATION));
  } catch {}
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

function isSessionValid(): boolean {
  const expiry = getSessionExpiry();
  if (!expiry) return false;
  return Date.now() < expiry;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

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
    json: "/file-json.svg",
    python: "/file-py.svg",
  };
  const src = map[lang];
  if (src) return <img src={src} alt={lang} className={className} draggable={false} />;
  return <FileCode className={`${className} text-white/40`} />;
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center group -ml-3">
          <img src="/codetory-enc.png" alt="Codetory" className="h-20 w-auto select-none pointer-events-none" draggable={false} />
        </Link>
        <Link
          to="/submit"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all text-[11px] font-bold text-white/50 hover:text-white tracking-wider"
        >
          <FilePlus className="w-3 h-3" />
          New
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
    <div className="relative">
      <div className="text-[11px] font-mono overflow-hidden">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: 'inherit', lineHeight: '1.4' }}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
          showLineNumbers
          startingLineNumber={1}
        >
          {visibleCode}
        </SyntaxHighlighter>
      </div>
      {!isFullyExpanded && (
        <div className="relative">
          <div className="absolute bottom-full left-0 right-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #161616)' }} />
          <button
            onClick={() => setVisibleCount(c => Math.min(c + LINES_PER_CHUNK, lines.length))}
            className="relative w-full flex items-center justify-center py-3 border-t border-white/20 bg-transparent hover:bg-white/[0.04] transition-all duration-200 group"
          >
            <ChevronRight className="w-6 h-6 rotate-90 text-white/50 group-hover:text-white group-hover:translate-y-0.5 transition-all duration-200" />
          </button>
        </div>
      )}
    </div>
  );
}

type SortOption = "newest" | "a-z" | "z-a";

function InlineDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <span className="text-[10px] text-white/25 uppercase tracking-widest select-none" style={{ fontFamily: "'Ubuntu Mono', monospace" }}>{label}</span>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[13px] font-bold text-white/60 hover:text-white/90 transition-colors"
        style={{ fontFamily: "'Ubuntu Mono', monospace" }}
      >
        {current?.label}
        <ChevronDown className={`w-3 h-3 text-white/20 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 top-full mt-2 border border-white/10 bg-[#191919] z-50 min-w-[110px] shadow-2xl overflow-hidden"
            style={{ borderRadius: 6 }}
          >
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${
                  value === opt.value
                    ? "text-white bg-white/[0.07]"
                    : "text-white/35 hover:text-white hover:bg-white/[0.04]"
                }`}
                style={{ fontFamily: "'Ubuntu Mono', monospace" }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Script {
  id: string; name: string; fileName: string;
  explanation: string; language: string; author: string; date: string;
}

function GroupSeparator({ label }: { label: string }) {
  return (
    <div className="col-span-full flex items-center gap-3 py-1 mt-2 first:mt-0">
      <span
        className="text-[15px] text-white/70 select-none"
        style={{ fontFamily: "'DotGothic16', sans-serif" }}
      >
        &gt;&gt; {label}
      </span>
      <div className="h-px flex-1 bg-white/[0.12]" />
    </div>
  );
}

function groupScripts(scripts: Script[], sort: SortOption): { key: string; label: string; items: Script[] }[] {
  if (sort === "newest") {
    const map = new Map<string, Script[]>();
    for (const s of scripts) {
      const d = new Date(s.date);
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(s);
    }
    return Array.from(map.entries()).map(([label, items]) => ({
      key: label,
      label,
      items: [...items].sort((a, b) => parseInt(b.id) - parseInt(a.id)), // ← tambah ini
    }));
  } else {
    const sorted = [...scripts].sort((a, b) =>
      sort === "a-z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
    const map = new Map<string, Script[]>();
    for (const s of sorted) {
      const letter = s.name[0]?.toUpperCase() || '#';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(s);
    }
    return Array.from(map.entries()).map(([letter, items]) => ({ key: letter, label: letter, items }));
  }
}

function Home() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>("a-z");
  const [langFilter, setLangFilter] = useState("all");

  useEffect(() => {
    fetch("/api/scripts")
      .then(res => res.json())
      .then(async ({ d }) => {
        const data = await decryptData(d);
        setScripts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load scripts", err);
        setLoading(false);
      });
  }, []);

  const availableLangs = Array.from(new Set(scripts.map(s => s.language))).sort();

  const langOptions = [
    { value: "all", label: "all" },
    ...availableLangs.map(l => ({ value: l, label: l.toLowerCase() })),
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: "newest" },
    { value: "a-z", label: "a–z" },
    { value: "z-a", label: "z–a" },
  ];

  const filteredScripts = scripts
    .filter(s =>
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.language.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (langFilter === "all" || s.language === langFilter)
    )
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sort === "a-z") return a.name.localeCompare(b.name);
      if (sort === "z-a") return b.name.localeCompare(a.name);
      return 0;
    });

  const groups = groupScripts(filteredScripts, sort);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-xl font-bold tracking-tight mb-1 text-white font-pixel">
            <a href="https://wa.me/62895423300395" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors">givy's</a> <span className="text-white/10">/</span> codetory
          </h1>
          <p className="text-neutral-400 text-sm max-w-md leading-relaxed font-lexend tracking-tight">
            a collection of snippets, scripts, and tools for personal projects
          </p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Search files..."
            className="w-full bg-white/[0.03] border border-white/[0.08] pl-11 pr-10 py-3.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
            style={{ borderRadius: 8 }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
        <div
          className="flex items-center gap-4 px-4 py-3 bg-white/[0.03] border border-white/[0.08]"
          style={{ borderRadius: 8 }}
        >
          <InlineDropdown label="Lang" options={langOptions} value={langFilter} onChange={setLangFilter} />
          <div className="w-px h-3.5 bg-white/[0.08]" />
          <InlineDropdown label="Sort" options={sortOptions} value={sort} onChange={(v) => setSort(v as SortOption)} />
          <div className="ml-auto">
            <span
              className="text-[13px] font-bold text-white/60 tabular-nums"
              style={{ fontFamily: "'Ubuntu Mono', monospace" }}
            >
              {loading ? "—" : `${filteredScripts.length} ${filteredScripts.length === 1 ? "file" : "files"}`}
            </span>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 border border-white/5 bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden" animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
        >
          {groups.map(group => (
            <>
              <GroupSeparator key={`sep-${group.key}`} label={group.label} />
              {group.items.map(script => (
                <Link key={script.id} to={`/view/${script.fileName}`} className="group">
                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                    className="border border-white/10 bg-white/[0.02] p-5 h-full hover:bg-white/[0.05] hover:border-white/30 transition-all duration-300 flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="p-0.5 border border-white/10 bg-white/5 flex-shrink-0">
                          <LangIcon language={script.language} className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white/80 group-hover:text-white tracking-tight leading-snug">{script.name}</h3>
                          {script.date && (
                            <span className="text-[9px] font-mono text-neutral-400">
                              {new Date(script.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono border border-white/5 px-2 py-0.5 bg-white/[0.12] flex-shrink-0 ml-2 text-white/50">{script.language}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3 flex-1">
                      <p className="text-xs text-neutral-400 font-medium leading-relaxed tracking-tight flex-1">{truncate(script.explanation, 45)}</p>
                      <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-all flex-shrink-0 mt-0.5" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </>
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

    const fetchMetadata = fetch("/api/scripts")
      .then(res => res.json())
      .then(async ({ d }) => {
        const data = await decryptData(d);
        const script = data.find((s: any) => s.fileName === fileName);
        setScriptData(script);
      });

    const fetchCode = fetch(`/api/scripts?fileName=${fileName}`)
      .then(res => res.json())
      .then(async ({ d, error: err }) => {
        if (err) throw new Error("Script not found");
        const { code: rawCode } = await decryptData(d);
        return rawCode as string;
      });

    Promise.all([fetchMetadata, fetchCode])
      .then(([_, text]) => {
        const trimmed = text.trimEnd();
        setIsLarge(new Blob([trimmed]).size > LARGE_FILE_THRESHOLD);
        setCode(trimmed);
        setLoading(false);
      })
      .catch(err => {
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
        <button onClick={() => navigate("/")} className="btn-primary">Return to Archive</button>
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
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="border border-white/10 bg-white/[0.02] p-4 sticky top-20"
          >
            <div className="p-1.5 bg-white/5 border border-white/10 w-fit mb-3">
              <LangIcon language={scriptData?.language} className="w-5 h-5" />
            </div>
            <h1 className="text-sm font-bold mb-0.5 break-all text-white/90">{fileName}</h1>
            {scriptData?.explanation && (
              <p className="text-xs text-neutral-400 font-medium leading-relaxed mt-2">{scriptData.explanation}</p>
            )}
            {!loading && code && (
              <p className="text-[10px] text-neutral-400 font-mono tracking-tight mt-3">
                {formatSize(new Blob([code]).size)}
                {scriptData?.date && <> · {new Date(scriptData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
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
                <a href={"/raw/" + fileName} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 text-white/30 hover:text-white transition-all text-[10px] font-bold tracking-tight">
                  <ExternalLink className="w-3 h-3" /> Raw
                </a>
                <span className="text-white/10 text-xs">|</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1 text-white/30 hover:text-white transition-all text-[10px] font-bold tracking-tight">
                  {copied ? <Check className="w-3 h-3 text-white/60" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <span className="text-white/10 text-xs">|</span>
                <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1 text-white/30 hover:text-white transition-all text-[10px] font-bold tracking-tight">
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </div>
            <div className="relative">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-3 bg-white/5 animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }} />
                  ))}
                </div>
              ) : isLarge ? (
                <LargeFileViewer code={code} language={scriptData?.language?.toLowerCase() || "text"} />
              ) : (
                <div className="text-[11px] font-mono overflow-hidden">
                  <SyntaxHighlighter
                    language={scriptData?.language?.toLowerCase() || "javascript"}
                    style={oneDark}
                    customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: 'inherit', lineHeight: '1.4' }}
                    codeTagProps={{ style: { fontFamily: 'inherit' } }}
                    showLineNumbers startingLineNumber={1}
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

function RawScript() {
  const { fileName } = useParams();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileName) { setError(true); return; }
    fetch(`/api/scripts?fileName=${fileName}`)
      .then(res => res.json())
      .then(async ({ d, error: err }) => {
        if (err) throw new Error("not found");
        const { code: rawCode } = await decryptData(d);
        setCode(rawCode as string);
      })
      .catch(() => setError(true));
  }, [fileName]);

  useEffect(() => {
    if (code === null && !error) return;
    document.title = fileName || "raw";
  }, [code, error, fileName]);

  if (error) {
    return (
      <pre style={{
        fontFamily: "monospace",
        fontSize: 13,
        color: "#f87171",
        padding: "2rem",
        background: "#0d0d0d",
        minHeight: "100vh",
        margin: 0,
      }}>
        404 — script not found
      </pre>
    );
  }

  if (code === null) {
    return (
      <pre style={{
        fontFamily: "monospace",
        fontSize: 13,
        color: "#555",
        padding: "2rem",
        background: "#0d0d0d",
        minHeight: "100vh",
        margin: 0,
      }}>
        loading...
      </pre>
    );
  }

  return (
    <pre style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      color: "#e2e8f0",
      padding: "2rem",
      background: "#0d0d0d",
      minHeight: "100vh",
      margin: 0,
      whiteSpace: "pre",
      overflowX: "auto",
      lineHeight: 1.6,
    }}>
      {code}
    </pre>
  );
}

function SessionBadge({ onExpire }: { onExpire: () => void }) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const tick = () => {
      const expiry = getSessionExpiry();
      if (!expiry) { onExpire(); return; }
      const left = expiry - Date.now();
      if (left <= 0) { clearSession(); onExpire(); return; }
      setRemaining(left);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onExpire]);

  const isWarning = remaining < 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-mono font-bold tracking-wider transition-all ${
        isWarning
          ? "border-red-500/30 bg-red-500/5 text-red-400/80"
          : "border-white/10 bg-white/5 text-white/40"
      }`}
      style={{ borderRadius: 6 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? "bg-red-400 animate-pulse" : "bg-green-400/60"}`} />
      session · {formatCountdown(remaining)}
    </motion.div>
  );
}

function Submit() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authed, setAuthed] = useState(() => isSessionValid());
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [tab, setTab] = useState<"add" | "edit" | "delete">("add");
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [form, setForm] = useState({ name: "", fileName: "", language: "JavaScript", explanation: "", code: "", author: "Givy" });
  const [fileBaseName, setFileBaseName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchManage, setSearchManage] = useState("");

  const handleExpire = () => {
    setAuthed(false);
    setPassword("");
  };

  useEffect(() => {
    if (!authed) return;
    setScriptsLoading(true);
    fetch("/api/scripts")
      .then(res => res.json())
      .then(async ({ d }) => {
        const data = await decryptData(d);
        setScripts(data);
        setScriptsLoading(false);
      })
      .catch(() => setScriptsLoading(false));
  }, [authed]);

  useEffect(() => {
    if (tab !== "add") return;
    setForm(f => ({ ...f, fileName: fileBaseName ? fileBaseName + getExt(f.language) : "" }));
  }, [form.language, tab]);

  useEffect(() => {
    if (mirrorRef.current) {
      setInputWidth(mirrorRef.current.offsetWidth);
    }
  }, [fileBaseName]);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(false);
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (res.ok) {
        setSessionExpiry();
        setAuthed(true);
      } else {
        setAuthError(true);
      }
    } catch { setAuthError(true); }
    finally { setAuthLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSelectEdit = (script: Script) => {
    setSelectedScript(script);
    setStatus("idle");
    setErrorMsg("");
    fetch(`/api/scripts?fileName=${script.fileName}`)
      .then(res => res.json())
      .then(async ({ d }) => {
        const { code } = await decryptData(d);
        setForm({ name: script.name, fileName: script.fileName, language: script.language, explanation: script.explanation, code, author: script.author });
      });
  };

  const handleAdd = async () => {
    if (!form.name || !form.fileName || !form.code) { setErrorMsg("Name, fileName, and code are required."); setStatus("error"); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setStatus("success");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) { setErrorMsg(err.message); setStatus("error"); }
  };

  const handleEdit = async () => {
    if (!selectedScript || !form.code) { setErrorMsg("Select a script and fill code."); setStatus("error"); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to edit");
      setStatus("success");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) { setErrorMsg(err.message); setStatus("error"); }
  };

  const handleDelete = async (fileName: string) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setScripts(s => s.filter(x => x.fileName !== fileName));
      setDeleteConfirm(null);
      setStatus("idle");
    } catch (err: any) { setErrorMsg(err.message); setStatus("error"); }
  };

  const tabClass = (t: string) => `px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${tab === t ? "text-white border-b border-white" : "text-white/30 hover:text-white/60"}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors mb-6 group text-[10px] font-bold uppercase tracking-wider">
        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> back to home
      </Link>

      {!authed ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-16">
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <h1 className="text-lg font-bold text-white font-pixel">Password</h1>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()}
                placeholder="Enter password..."
                className="w-full bg-white/5 border border-white/10 px-3 py-2 pr-9 text-sm text-white focus:outline-none focus:border-white/30 transition-all"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {authError && <p className="text-red-400 text-xs font-mono">Wrong password.</p>}
            <button onClick={handleAuth} disabled={authLoading}
              className="px-4 py-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {authLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</> : "Enter"}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white font-pixel">Manage Scripts</h1>
            <SessionBadge onExpire={handleExpire} />
          </div>

          <div className="flex items-center border-b border-white/10 mb-6">
  <button className={tabClass("add")} onClick={() => { setTab("add"); setStatus("idle"); setErrorMsg(""); setFileBaseName(""); setForm({ name: "", fileName: "", language: "JavaScript", explanation: "", code: "", author: "Givy" }); }}>Add</button>
  <button className={tabClass("edit")} onClick={() => { setTab("edit"); setStatus("idle"); setErrorMsg(""); setSelectedScript(null); setSearchManage(""); }}>Edit</button>
  <button className={tabClass("delete")} onClick={() => { setTab("delete"); setStatus("idle"); setErrorMsg(""); setSearchManage(""); }}>Delete</button>
  {!scriptsLoading && (
    <span className="ml-auto text-[13px] font-bold text-white/60 tabular-nums pb-1.5" style={{ fontFamily: "'Ubuntu Mono', monospace" }}>
      {scripts.length} {scripts.length === 1 ? "file" : "files"}
    </span>
  )}
</div>

          {tab === "add" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Name</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Catbox Uploader"
                  className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Language</label>
                <div className="relative">
                  <select name="language" value={form.language} onChange={handleChange}
                    className="w-full appearance-none bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all pr-8">
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
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">File Name</label>
                <div className="bg-white/5 border border-white/10 focus-within:border-white/30 transition-all px-3 py-2 flex items-center w-full overflow-hidden">
                  <span
                    ref={mirrorRef}
                    className="invisible absolute text-sm font-mono whitespace-pre pointer-events-none"
                    aria-hidden="true"
                  >
                    {fileBaseName || "catbox"}
                  </span>
                  <div className="flex items-center min-w-0">
                    <input
                      value={fileBaseName}
                      onChange={e => {
                        const base = e.target.value;
                        setFileBaseName(base);
                        setForm(f => ({ ...f, fileName: base ? base + getExt(f.language) : "" }));
                      }}
                      placeholder="catbox"
                      className="bg-transparent text-sm text-white font-mono focus:outline-none placeholder:text-white/30 min-w-[1ch]"
                      ref={fileInputRef}
                      style={{ width: inputWidth > 0 ? `${inputWidth}px` : "60px" }}
                    />
                    <span className="text-sm font-mono text-white/40 select-none flex-shrink-0">{getExt(form.language)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Explanation</label>
                <textarea name="explanation" value={form.explanation} onChange={handleChange} placeholder="Script ini berfungsi untuk..." rows={3}
                  className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all resize-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Code</label>
                <textarea name="code" value={form.code} onChange={handleChange} placeholder="const x = ..." rows={12}
                  className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-all resize-none" />
              </div>
              {status === "error" && <p className="text-red-400 text-xs font-mono">{errorMsg}</p>}
              {status === "success" && <p className="text-green-400 text-xs font-mono">Script berhasil ditambahkan! Redirecting...</p>}
              <button onClick={handleAdd} disabled={status === "loading" || status === "success"}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {status === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Plus className="w-4 h-4" /> Submit Script</>}
              </button>
            </div>
          )}

          {tab === "edit" && (
            <div className="flex flex-col gap-4">
              {!selectedScript ? (
                scriptsLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 animate-pulse" />)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="relative mb-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <input
                        type="text"
                        placeholder="Search scripts..."
                        value={searchManage}
                        onChange={e => setSearchManage(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                    {scripts.filter(s => s.name.toLowerCase().includes(searchManage.toLowerCase()) || s.fileName.toLowerCase().includes(searchManage.toLowerCase())).map(s => (
                      <button key={s.id} onClick={() => handleSelectEdit(s)}
                        className="flex items-center justify-between px-3 py-2.5 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 transition-all text-left group">
                        <div className="flex items-center gap-2.5">
                          <LangIcon language={s.language} className="w-4 h-4" />
                          <span className="text-sm text-white/70 group-hover:text-white font-medium">{s.name}</span>
                          <span className="text-[10px] font-mono text-neutral-500">{s.fileName}</span>
                        </div>
                        <Pencil className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-all" />
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400">Editing: <span className="text-white/60">{selectedScript.fileName}</span></span>
                    <button onClick={() => setSelectedScript(null)} className="text-white/30 hover:text-white transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Name</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Catbox Uploader"
                      className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">File Name</label>
                    <input name="fileName" value={form.fileName} onChange={handleChange} placeholder="catbox.js"
                      className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-all" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Explanation</label>
                    <textarea name="explanation" value={form.explanation} onChange={handleChange} rows={3}
                      className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-all resize-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Code</label>
                    <textarea name="code" value={form.code} onChange={handleChange} rows={12}
                      className="bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/30 transition-all resize-none" />
                  </div>
                  {status === "error" && <p className="text-red-400 text-xs font-mono">{errorMsg}</p>}
                  {status === "success" && <p className="text-green-400 text-xs font-mono">Script berhasil diupdate! Redirecting...</p>}
                  <button onClick={handleEdit} disabled={status === "loading" || status === "success"}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {status === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Pencil className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "delete" && (
            <div className="flex flex-col gap-2">
              {scriptsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 animate-pulse" />)}
                </div>
              ) : (
                <>
                  <div className="relative mb-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                    <input
                      type="text"
                      placeholder="Search scripts..."
                      value={searchManage}
                      onChange={e => setSearchManage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                    />
                  </div>
                  {scripts.filter(s => s.name.toLowerCase().includes(searchManage.toLowerCase()) || s.fileName.toLowerCase().includes(searchManage.toLowerCase())).map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 border border-white/10 bg-white/[0.02]">
                      <div className="flex items-center gap-2.5">
                        <LangIcon language={s.language} className="w-4 h-4" />
                        <span className="text-sm text-white/70 font-medium">{s.name}</span>
                        <span className="text-[10px] font-mono text-neutral-500">{s.fileName}</span>
                      </div>
                      {deleteConfirm === s.fileName ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-red-400 font-mono">sure?</span>
                          <button onClick={() => handleDelete(s.fileName)} className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-all">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-wider transition-all">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(s.fileName)} className="text-white/20 hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
              {status === "error" && <p className="text-red-400 text-xs font-mono mt-2">{errorMsg}</p>}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">{children}</div>
      <footer className="border-t border-white/5 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-neutral-500 text-xs font-medium">
          <p>© 2026 Codetory</p>
          <p>Built by <a href="https://wa.me/62895423300395" target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-white transition-colors">Givy</a></p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/raw/:fileName" element={<RawScript />} />
        <Route path="*" element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/view/:fileName" element={<ViewScript />} />
              <Route path="/submit" element={<Submit />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </Router>
  );
}
