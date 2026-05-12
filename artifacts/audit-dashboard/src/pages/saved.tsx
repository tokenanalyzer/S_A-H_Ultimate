import { useState } from "react";
import { useSavedFindings } from "@/hooks/use-saved-findings";
import type { SavedFinding } from "@/hooks/use-saved-findings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bookmark, Trash2, Code2, Bug, ChevronDown, ChevronUp,
  Copy, ClipboardCheck, ExternalLink, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Severity config ─────────────────────────────────────────────────────── */
const SEVERITY_CONFIG: Record<string, { label: string; textCls: string; bgCls: string; dot: string }> = {
  critical:      { label: "Critical", textCls: "severity-critical",      bgCls: "bg-severity-critical border",      dot: "bg-red-500"    },
  high:          { label: "High",     textCls: "severity-high",          bgCls: "bg-severity-high border",          dot: "bg-orange-500" },
  medium:        { label: "Medium",   textCls: "severity-medium",        bgCls: "bg-severity-medium border",        dot: "bg-amber-500"  },
  low:           { label: "Low",      textCls: "severity-low",           bgCls: "bg-severity-low border",           dot: "bg-blue-500"   },
  informational: { label: "Info",     textCls: "severity-informational", bgCls: "bg-severity-informational border", dot: "bg-gray-400"   },
};

/* ── Copy button ─────────────────────────────────────────────────────────── */
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch { const e = document.createElement("textarea"); e.value = text; document.body.appendChild(e); e.select(); document.execCommand("copy"); document.body.removeChild(e); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle}
      className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all",
        copied ? "border-green-300 bg-green-50 text-green-700" : "border-border bg-white text-muted-foreground hover:text-foreground"
      )}>
      {copied ? <><ClipboardCheck className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> {label}</>}
    </button>
  );
}

/* ── Severity filter pill ────────────────────────────────────────────────── */
const SEVERITIES = ["all", "critical", "high", "medium", "low", "informational"] as const;
type SevFilter = (typeof SEVERITIES)[number];

/* ── Single saved finding card ───────────────────────────────────────────── */
function SavedCard({ finding, onRemove }: { finding: SavedFinding; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.informational;

  const reportText = [
    `SEVERITY: ${finding.severity.toUpperCase()}`,
    `TITLE: ${finding.title}`,
    `REPO: ${finding.repoUrl}`,
    ``,
    `DESCRIPTION:`,
    finding.description,
    finding.affectedCode ? `\nAFFECTED CODE:\n${finding.affectedCode}` : "",
  ].filter(Boolean).join("\n");

  return (
    <div className={cn("rounded-xl border transition-all", cfg.bgCls)}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => setExpanded(!expanded)}>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0", cfg.textCls)}
            style={{ borderColor: "currentColor", opacity: 0.8 }}>
            {cfg.label}
          </span>
          <span className="text-sm font-semibold text-foreground leading-snug">{finding.title}</span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <CopyBtn text={reportText} label="Copy" />
          <button onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
            title="Remove from saved">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Repo + saved date */}
      <div className="flex items-center gap-3 px-4 pb-2 -mt-2">
        <a href={finding.repoUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-xs">
          <ExternalLink className="h-3 w-3 shrink-0" />
          {finding.repoUrl.replace("https://github.com/", "")}
        </a>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(finding.savedAt).toLocaleDateString()}
        </span>
      </div>

      <p className="text-xs text-muted-foreground px-4 pb-3 leading-relaxed">{finding.description}</p>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-black/5 pt-4">
          {finding.affectedCode && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Code2 className="h-3.5 w-3.5" /><span className="font-medium">Affected Code</span>
                </div>
                <CopyBtn text={finding.affectedCode} label="Copy Code" />
              </div>
              <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-800 whitespace-pre-wrap">
                {finding.affectedCode}
              </pre>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bug className="h-3.5 w-3.5" /><span className="font-medium">Foundry PoC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {finding.pocSource === "groq" ? "Groq Llama 3" : finding.pocSource === "sambanova" ? "SambaNova 405B" : "Unavailable"}
                </span>
                <CopyBtn text={finding.poc} label="Copy PoC" />
              </div>
            </div>
            <pre className="text-xs font-mono bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {finding.poc}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SavedPage() {
  const { saved, removeSaved, clearAll } = useSavedFindings();
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [repoFilter, setRepoFilter] = useState<string>("all");

  const repos = Array.from(new Set(saved.map((f) => f.repoUrl)));

  const filtered = saved.filter((f) => {
    const sevOk = sevFilter === "all" || f.severity === sevFilter;
    const repoOk = repoFilter === "all" || f.repoUrl === repoFilter;
    return sevOk && repoOk;
  });

  const counts: Record<string, number> = {};
  for (const f of saved) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sah-saved-findings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-primary" />
            Saved Findings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {saved.length} finding{saved.length !== 1 ? "s" : ""} saved across {repos.length} repo{repos.length !== 1 ? "s" : ""}
          </p>
        </div>
        {saved.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={exportJson}>
              <Copy className="h-3.5 w-3.5" /> Export JSON
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={clearAll}>
              <Trash2 className="h-3.5 w-3.5" /> Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Severity summary cards */}
      {saved.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {(["critical", "high", "medium", "low", "informational"] as const).map(sev => {
            const cfg = SEVERITY_CONFIG[sev];
            const n = counts[sev] ?? 0;
            return (
              <div key={sev}
                className={cn("rounded-xl border p-3 text-center cursor-pointer transition-all", cfg.bgCls,
                  sevFilter === sev && "ring-2 ring-primary ring-offset-1")}
                onClick={() => setSevFilter(sevFilter === sev ? "all" : sev)}>
                <p className={cn("text-lg font-bold", cfg.textCls)}>{n}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Repo filter */}
      {repos.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setRepoFilter("all")}
            className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all",
              repoFilter === "all" ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40")}>
            All repos
          </button>
          {repos.map(r => (
            <button key={r}
              onClick={() => setRepoFilter(repoFilter === r ? "all" : r)}
              className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all truncate max-w-[200px]",
                repoFilter === r ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40")}>
              {r.replace("https://github.com/", "")}
            </button>
          ))}
        </div>
      )}

      {/* Findings list */}
      {saved.length === 0 ? (
        <Card className="border-border text-center py-16" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <Bookmark className="h-10 w-10 text-primary/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No saved findings yet</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
            Run a scan on the Scanner page and click the bookmark icon on any finding to save it here
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border text-center py-10">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No findings match the selected filter</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => (
            <SavedCard key={f.id} finding={f} onRemove={() => removeSaved(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
