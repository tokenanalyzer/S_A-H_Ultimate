import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useStartAnalysis, useGetAnalysisJob } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import SecurityScore from "@/components/security-score";
import { generateAuditPDF } from "@/lib/pdf-export";
import { useSavedFindings } from "@/hooks/use-saved-findings";
import {
  Scan, Play, AlertTriangle, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, Code2, Terminal,
  Zap, Shield, Bug, Check, FileDown, Copy, ClipboardCheck,
  Bookmark, BookmarkCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisJob } from "@workspace/api-client-react";

/* ── Copy button ─────────────────────────────────────────────────────────── */
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handle}
      className={cn(
        "flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-all duration-150",
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-border bg-white text-muted-foreground hover:text-foreground hover:border-primary/40"
      )}
      title={copied ? "Copied!" : label}
    >
      {copied
        ? <><ClipboardCheck className="h-3 w-3" /> Copied!</>
        : <><Copy className="h-3 w-3" /> {label}</>}
    </button>
  );
}

/* ── Severity config ─────────────────────────────────────────────────────── */
const SEVERITY_CONFIG: Record<string, { label: string; textCls: string; bgCls: string }> = {
  critical:      { label: "Critical", textCls: "severity-critical", bgCls: "bg-severity-critical border" },
  high:          { label: "High",     textCls: "severity-high",     bgCls: "bg-severity-high border"     },
  medium:        { label: "Medium",   textCls: "severity-medium",   bgCls: "bg-severity-medium border"   },
  low:           { label: "Low",      textCls: "severity-low",      bgCls: "bg-severity-low border"      },
  informational: { label: "Info",     textCls: "severity-informational", bgCls: "bg-severity-informational border" },
};

/* ── Pipeline steps ──────────────────────────────────────────────────────── */
const PIPELINE_STEPS = [
  { status: "harvesting",      label: "Clone & harvest .sol" },
  { status: "scanning",        label: "Gemini hybrid analysis" },
  { status: "generating_pocs", label: "Generate PoC exploits"  },
  { status: "complete",        label: "Report ready"           },
];

function stepState(current: string, stepStatus: string): "done" | "active" | "idle" {
  const order: Record<string, number> = {
    pending: 0, harvesting: 1, scanning: 2, generating_pocs: 3, complete: 4, failed: 5,
  };
  const c = order[current] ?? 0;
  const s = order[stepStatus] ?? 0;
  if (s < c) return "done";
  if (s === c) return "active";
  return "idle";
}

function progressValue(status: string): number {
  return { pending: 4, harvesting: 22, scanning: 52, generating_pocs: 80, complete: 100, failed: 0 }[status] ?? 0;
}

const LOG_STYLE: Record<string, string> = {
  SYSTEM: "text-blue-600 font-semibold",
  INFO:   "text-gray-700",
  DEBUG:  "text-gray-400",
  WARN:   "text-amber-600",
  ERROR:  "text-red-600",
};

/* ── Finding card ─────────────────────────────────────────────────────────── */
function FindingCard({
  finding,
  repoUrl,
}: {
  finding: NonNullable<AnalysisJob["findings"]>[number];
  repoUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.informational;
  const { isSaved, toggleSave } = useSavedFindings();
  const saved = isSaved(finding.id);

  const reportText = [
    `SEVERITY: ${finding.severity.toUpperCase()}`,
    `TITLE: ${finding.title}`,
    `REPO: ${repoUrl}`,
    ``,
    `DESCRIPTION:`,
    finding.description,
    finding.affectedCode ? `\nAFFECTED CODE:\n${finding.affectedCode}` : "",
  ].filter(Boolean).join("\n");

  return (
    <div
      className={cn("rounded-xl border transition-all", cfg.bgCls)}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <button
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <span
            className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0", cfg.textCls)}
            style={{ borderColor: "currentColor", opacity: 0.8 }}
          >
            {cfg.label}
          </span>
          <span className="text-sm font-semibold text-foreground leading-snug">{finding.title}</span>
        </button>
        {/* Action row — bookmark + copy + expand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => toggleSave(finding, repoUrl)}
            className={cn(
              "p-1.5 rounded-md border transition-all duration-150",
              saved
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-white text-muted-foreground hover:text-primary hover:border-primary/40"
            )}
            title={saved ? "Remove from saved" : "Save finding"}
          >
            {saved
              ? <BookmarkCheck className="h-3.5 w-3.5" />
              : <Bookmark className="h-3.5 w-3.5" />}
          </button>
          <CopyBtn text={reportText} label="Copy" />
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground px-4 pb-3 leading-relaxed -mt-1">{finding.description}</p>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-black/5 pt-4">
          {/* Affected code */}
          {finding.affectedCode && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Code2 className="h-3.5 w-3.5" />
                  <span className="font-medium">Affected Code</span>
                </div>
                <CopyBtn text={finding.affectedCode} label="Copy Code" />
              </div>
              <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-800 whitespace-pre-wrap">
                {finding.affectedCode}
              </pre>
            </div>
          )}

          {/* PoC */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bug className="h-3.5 w-3.5" />
                <span className="font-medium">Foundry PoC Exploit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {finding.pocSource === "groq"
                    ? "Groq Llama 3"
                    : finding.pocSource === "sambanova"
                    ? "SambaNova 405B"
                    : "Unavailable"}
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
export default function ScannerPage() {
  const [location] = useLocation();
  const [repoUrl, setRepoUrl]         = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showLogs, setShowLogs]       = useState(false);
  const [polling, setPolling]         = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const repo = params.get("repo");
    if (repo) setRepoUrl(repo);
  }, [location]);

  const startAnalysis = useStartAnalysis({
    mutation: {
      onSuccess: (jobRef) => {
        setActiveJobId(jobRef.jobId);
        setShowLogs(false);
        setPolling(true);
      },
    },
  });

  const { data: job } = useGetAnalysisJob(activeJobId ?? "", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: !!activeJobId, refetchInterval: polling ? 3000 : false } as any,
  });

  useEffect(() => {
    if (job?.status === "complete" || job?.status === "failed") {
      setPolling(false);
    }
  }, [job?.status]);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [job?.logs]);

  const handleScan = () => {
    if (!repoUrl.trim()) return;
    startAnalysis.mutate({ data: { repoUrl: repoUrl.trim() } });
  };

  const isRunning = job && job.status !== "complete" && job.status !== "failed";
  const progress  = job ? progressValue(job.status) : 0;

  const sortedFindings = (job?.findings ?? [])
    .slice()
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    });

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Scanner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Human+AI Hybrid · 10 Security Lenses · Logic Flaw Detection · Polls every 3s
        </p>
      </div>

      {/* Input */}
      <Card className="border-border" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                placeholder="https://github.com/org/repo"
                className="pl-9 text-sm"
              />
            </div>
            <Button
              onClick={handleScan}
              disabled={!repoUrl.trim() || startAnalysis.isPending || !!isRunning}
              className="shrink-0"
            >
              {startAnalysis.isPending
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <Play className="h-4 w-4 mr-1.5" />}
              Scan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Paste a GitHub URL with Solidity contracts. Results stream every 3 seconds automatically.
          </p>
        </CardContent>
      </Card>

      {/* Active job */}
      {activeJobId && job && (
        <div className="space-y-4">

          {/* Progress card */}
          <Card className="border-border overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="h-1 w-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-700 ease-out rounded-full",
                  isRunning ? "progress-shimmer" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-1 sm:gap-2 mb-4">
                {PIPELINE_STEPS.map((step, i) => {
                  const state = stepState(job.status, step.status);
                  return (
                    <div key={step.status} className="flex flex-col items-center gap-1 flex-1">
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all",
                        state === "done"   && "bg-green-500 border-green-500 text-white",
                        state === "active" && "bg-primary border-primary text-white",
                        state === "idle"   && "bg-white border-gray-200 text-gray-300",
                      )}>
                        {state === "done"
                          ? <Check className="h-3.5 w-3.5" />
                          : state === "active"
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : i + 1}
                      </div>
                      <span className={cn(
                        "text-xs text-center leading-tight hidden sm:block",
                        state === "done"   && "pipeline-step-done",
                        state === "active" && "pipeline-step-active",
                        state === "idle"   && "pipeline-step-idle",
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {job.stats && (
                <div className="flex flex-wrap gap-4 pt-3 border-t border-border">
                  {[
                    { label: "Files",    value: job.stats.fileCount },
                    { label: "Context",  value: `${job.stats.contextSizeKb} KB` },
                    { label: "Findings", value: job.stats.findingCount },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                  {job.status === "complete" && (
                    <div className="ml-auto">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs */}
          <Card className="border-border" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <button
              className="flex items-center gap-2 w-full px-4 py-3 text-left border-b border-border hover:bg-gray-50 transition-colors"
              onClick={() => setShowLogs(!showLogs)}
            >
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Pipeline Logs</span>
              {(job.logs ?? []).length > 0 && (
                <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full ml-1">
                  {(job.logs ?? []).length}
                </span>
              )}
              <span className="ml-auto">
                {showLogs
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </button>
            {showLogs && (
              <div ref={logsRef} className="h-44 overflow-y-auto bg-gray-50 p-3 space-y-0.5">
                {(job.logs ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Awaiting output…</p>
                ) : (
                  (job.logs ?? []).map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono">
                      <span className="text-gray-400 shrink-0 w-14">{log.time}</span>
                      <span className={cn("shrink-0 w-14", LOG_STYLE[log.level] ?? "text-gray-600")}>
                        [{log.level}]
                      </span>
                      <span className={cn(LOG_STYLE[log.level] ?? "text-gray-600")}>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Scorecard + PDF */}
          {job.status === "complete" && job.findings && (
            <div className="space-y-3">
              <SecurityScore findings={job.findings} />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => generateAuditPDF(job)}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export Full PDF Report
                </Button>
              </div>
            </div>
          )}

          {/* Findings */}
          {job.status === "complete" && sortedFindings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                Vulnerabilities
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({sortedFindings.length} found)
                </span>
              </h2>
              {sortedFindings.map(f => <FindingCard key={f.id} finding={f} repoUrl={job.repoUrl} />)}
            </div>
          )}

          {job.status === "complete" && sortedFindings.length === 0 && (
            <Card className="border-border text-center py-10">
              <Shield className="h-10 w-10 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No vulnerabilities detected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Gemini found no exploitable issues in this codebase
              </p>
            </Card>
          )}

          {job.status === "failed" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Scan Failed</p>
                  <p className="text-xs text-red-600 mt-1">{job.error}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!activeJobId && (
        <Card className="border-border text-center py-14" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <Zap className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            Enter a GitHub repository to begin scanning
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
            Human+AI hybrid engine · 10 security lenses · Logic flaw detection · Foundry PoC generation
          </p>
        </Card>
      )}
    </div>
  );
}
