import { useState } from "react";
import { useListAnalysisJobs, useGetAnalysisJob } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SecurityScore, { computeScore } from "@/components/security-score";
import { generateAuditPDF } from "@/lib/pdf-export";
import {
  FileText, CheckCircle2, AlertTriangle, Loader2,
  Clock, ChevronRight, Download, Bug, Shield, Code2,
  ChevronDown, ChevronUp, FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { AnalysisJob } from "@workspace/api-client-react";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  complete:       { icon: CheckCircle2, color: "text-green-600"     },
  failed:         { icon: AlertTriangle, color: "text-red-500"      },
  pending:        { icon: Loader2,      color: "text-amber-500"     },
  harvesting:     { icon: Loader2,      color: "text-amber-500"     },
  scanning:       { icon: Loader2,      color: "text-amber-500"     },
  generating_pocs:{ icon: Loader2,      color: "text-amber-500"     },
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3, informational: 4,
};

const SEV_BADGE: Record<string, string> = {
  critical:      "bg-red-50 text-red-700 border-red-200",
  high:          "bg-orange-50 text-orange-700 border-orange-200",
  medium:        "bg-yellow-50 text-yellow-800 border-yellow-200",
  low:           "bg-blue-50 text-blue-700 border-blue-200",
  informational: "bg-gray-50 text-gray-600 border-gray-200",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function countBySeverity(findings: AnalysisJob["findings"]) {
  return (findings ?? []).reduce<Record<string, number>>((a, f) => {
    a[f.severity] = (a[f.severity] ?? 0) + 1; return a;
  }, {});
}

/* ── Detail panel ───────────────────────────────────────────────────────── */
function DetailPanel({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data: job } = useGetAnalysisJob(jobId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!job) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const sorted = (job.findings ?? [])
    .slice()
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5));

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ repoUrl: job.repoUrl, scannedAt: job.completedAt, stats: job.stats, findings: sorted }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${job.jobId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground break-all">{job.repoUrl}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fmt(job.createdAt)}
            {job.stats && ` · ${job.stats.fileCount} files · ${job.stats.contextSizeKb} KB`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          {job.status === "complete" && (
            <>
              <Button
                size="sm"
                className="text-xs h-7 gap-1 bg-primary text-white hover:bg-primary/90"
                onClick={() => generateAuditPDF(job)}
              >
                <FileDown className="h-3 w-3" />PDF Report
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleExportJSON}>
                <Download className="h-3 w-3 mr-1" />JSON
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onClose}>Close</Button>
        </div>
      </div>

      {/* Score */}
      {job.status === "complete" && job.findings && (
        <SecurityScore findings={job.findings} />
      )}

      {/* Findings */}
      {job.status === "complete" && sorted.length === 0 && (
        <div className="text-center py-8 border border-border rounded-xl bg-gray-50">
          <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No vulnerabilities detected</p>
        </div>
      )}

      {sorted.map(finding => {
        const open = expanded.has(finding.id);
        return (
          <div key={finding.id}
            className={cn("rounded-xl border p-4 transition-all", SEV_BADGE[finding.severity] ?? "")}
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <button className="flex items-center gap-2 w-full text-left" onClick={() => toggle(finding.id)}>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 capitalize",
                SEV_BADGE[finding.severity])}>
                {finding.severity}
              </span>
              <span className="text-sm font-semibold flex-1 text-foreground">{finding.title}</span>
              {open
                ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </button>

            <p className="text-xs text-gray-600 mt-2 leading-relaxed">{finding.description}</p>

            {open && (
              <div className="mt-3 space-y-3 border-t border-black/5 pt-3">
                {finding.affectedCode && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Code2 className="h-3 w-3" /> Affected Code
                    </p>
                    <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap text-gray-800">
                      {finding.affectedCode}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Bug className="h-3 w-3" /> Foundry PoC
                    </p>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {finding.pocSource === "groq" ? "Groq Llama 3"
                        : finding.pocSource === "sambanova" ? "SambaNova 405B"
                        : "N/A"}
                    </span>
                  </div>
                  <pre className="text-xs font-mono bg-gray-900 text-green-400 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap">
                    {finding.poc}
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Reports page ───────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { data: jobs = [], isLoading } = useListAnalysisJobs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historical scans with security scores, vulnerability details, and PoC exports
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border-border text-center py-14" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No scan reports yet</p>
          <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => navigate("/scanner")}>
            Start a scan
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Job list */}
          <div className="space-y-2.5">
            {jobs.map(job => {
              const conf  = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.complete;
              const Icon  = conf.icon;
              const counts = countBySeverity(job.findings);
              const selected = selectedId === job.jobId;
              const score = job.status === "complete" && job.findings
                ? computeScore(job.findings)
                : null;

              return (
                <div
                  key={job.jobId}
                  onClick={() => setSelectedId(selected ? null : job.jobId)}
                  className={cn(
                    "bg-white rounded-xl border p-4 cursor-pointer transition-all duration-150",
                    "hover:border-primary/40 hover:shadow-md",
                    selected ? "border-primary ring-1 ring-primary/20" : "border-border",
                  )}
                  style={{ boxShadow: selected ? "0 0 0 3px rgba(0,113,227,0.08)" : "0 1px 4px rgba(0,0,0,0.05)" }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", conf.color,
                      job.status !== "complete" && job.status !== "failed" ? "animate-spin" : "")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {job.repoUrl.replace("https://github.com/", "")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{fmt(job.createdAt)}</span>
                        {score !== null && (
                          <span className={cn(
                            "ml-auto text-xs font-bold px-2 py-0.5 rounded-full",
                            score >= 90 ? "bg-green-50 text-green-700"
                            : score >= 75 ? "bg-blue-50 text-blue-700"
                            : score >= 55 ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                          )}>
                            Score {score}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Object.entries(counts)
                        .sort(([a], [b]) => (SEVERITY_ORDER[a] ?? 5) - (SEVERITY_ORDER[b] ?? 5))
                        .map(([sev, count]) => (
                          <span key={sev}
                            className={cn("text-xs px-1.5 py-0.5 rounded border font-semibold", SEV_BADGE[sev])}>
                            {count}
                          </span>
                        ))}
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 text-muted-foreground ml-1 transition-transform",
                        selected && "rotate-90"
                      )} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div>
            {selectedId ? (
              <div className="bg-white rounded-xl border border-border p-5 space-y-4"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <DetailPanel jobId={selectedId} onClose={() => setSelectedId(null)} />
              </div>
            ) : (
              <div className="border border-border rounded-xl bg-white flex flex-col items-center justify-center py-16 text-center"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Select a report to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
