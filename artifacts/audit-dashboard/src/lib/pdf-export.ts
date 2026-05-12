import jsPDF from "jspdf";
import { computeScore } from "@/components/security-score";
import type { AnalysisJob } from "@workspace/api-client-react";

/* ── Colours ──────────────────────────────────────────────────────────────── */
const C = {
  blue:      [0,   113, 227] as const,
  darkText:  [29,  29,  31]  as const,
  mutedText: [110, 110, 115] as const,
  border:    [229, 229, 234] as const,
  pageBg:    [250, 250, 252] as const,
  white:     [255, 255, 255] as const,
  critical:  [192, 57,  43]  as const,
  high:      [211, 84,  0]   as const,
  medium:    [155, 119, 0]   as const,
  low:       [26,  111, 168] as const,
  info:      [110, 110, 115] as const,
  green:     [22,  163, 74]  as const,
  amber:     [217, 119, 6]   as const,
};

type RGB = readonly [number, number, number];

function sevColor(sev: string): RGB {
  return { critical: C.critical, high: C.high, medium: C.medium, low: C.low }[sev] ?? C.info;
}

function sevLabel(sev: string): string {
  return { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW", informational: "INFO" }[sev] ?? "INFO";
}

function scoreColor(score: number): RGB {
  if (score >= 90) return C.green;
  if (score >= 75) return C.blue;
  if (score >= 55) return C.amber;
  return C.critical;
}

function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

/* ── Layout helpers ───────────────────────────────────────────────────────── */
const PW = 210; // A4 width mm
const PH = 297; // A4 height mm
const ML = 18;  // left margin
const MR = 18;  // right margin
const CW = PW - ML - MR; // content width

function setFont(doc: jsPDF, size: number, style: "normal" | "bold" | "italic" = "normal", color: RGB = C.darkText) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function hline(doc: jsPDF, y: number, color: RGB = C.border, lw = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(ML, y, PW - MR, y);
}

function pill(doc: jsPDF, x: number, y: number, label: string, color: RGB) {
  const w = doc.getTextWidth(label) + 6;
  const h = 6;
  doc.setFillColor(...color);
  doc.setDrawColor(...color);
  doc.roundedRect(x, y - 4.5, w, h, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + 3, y);
  return w + 2;
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function codeBlock(doc: jsPDF, code: string, y: number, maxH = 80): number {
  const lines = code.split("\n").slice(0, 60);
  const lineH = 4.2;
  const blockH = Math.min(lines.length * lineH + 6, maxH);

  if (y + blockH > PH - 25) { doc.addPage(); y = 25; }

  doc.setFillColor(30, 30, 35);
  doc.roundedRect(ML, y, CW, blockH, 2, 2, "F");

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(134, 239, 172); // green-300

  let ty = y + 5;
  for (const line of lines) {
    if (ty + lineH > y + blockH - 2) break;
    const safe = line.substring(0, 110);
    doc.text(safe, ML + 3, ty);
    ty += lineH;
  }
  return y + blockH + 4;
}

/** Add standard page header (small) */
function pageHeader(doc: jsPDF, repo: string) {
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, PW, 10, "F");
  setFont(doc, 7, "bold", C.white);
  doc.text("S_A-H ULTIMATE  ·  Smart Contract Security Audit", ML, 6.5);
  setFont(doc, 7, "normal", [200, 220, 255]);
  doc.text(repo.replace("https://github.com/", ""), PW - MR, 6.5, { align: "right" });
}

/** Add page number footer */
function pageFooter(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) {
    doc.setPage(i);
    setFont(doc, 7, "normal", C.mutedText);
    doc.text(`Page ${i} of ${n}`, PW / 2, PH - 8, { align: "center" });
    hline(doc, PH - 12, C.border, 0.2);
  }
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export function generateAuditPDF(job: AnalysisJob): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const findings = (job.findings ?? []).slice().sort((a, b) => {
    const ord: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, informational: 4 };
    return (ord[a.severity] ?? 5) - (ord[b.severity] ?? 5);
  });
  const score   = computeScore(findings);
  const grade   = gradeFor(score);
  const sColor  = scoreColor(score);
  const counts  = findings.reduce<Record<string, number>>((a, f) => {
    a[f.severity] = (a[f.severity] ?? 0) + 1; return a;
  }, {});
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const repoShort = job.repoUrl.replace("https://github.com/", "");

  /* ═════════════════════════════════════════════════════════════
     PAGE 1 — COVER
  ═══════════════════════════════════════════════════════════════ */

  // Deep blue gradient band (top 40%)
  doc.setFillColor(5, 20, 55);
  doc.rect(0, 0, PW, 118, "F");
  doc.setFillColor(...C.blue);
  doc.rect(0, 110, PW, 12, "F");

  // Shield icon (drawn)
  const sx = PW / 2, sy = 24, sr = 12;
  doc.setFillColor(...C.blue);
  doc.circle(sx, sy, sr + 2, "F");
  doc.setFillColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(5, 20, 55);
  doc.text("🛡", sx - 4.5, sy + 5.5);

  // Title
  setFont(doc, 28, "bold", C.white);
  doc.text("S_A-H ULTIMATE", PW / 2, 52, { align: "center" });
  setFont(doc, 12, "normal", [180, 200, 240]);
  doc.text("Smart Contract Security Audit Report", PW / 2, 62, { align: "center" });

  // Divider line
  doc.setDrawColor(255, 255, 255, 0.3);
  doc.setLineWidth(0.4);
  doc.line(ML + 20, 69, PW - MR - 20, 69);

  // Repo & date
  setFont(doc, 10, "normal", [200, 220, 255]);
  doc.text(repoShort, PW / 2, 78, { align: "center" });
  setFont(doc, 9, "normal", [150, 170, 210]);
  doc.text(`Generated ${dateStr}`, PW / 2, 86, { align: "center" });

  // Score badge
  const bx = PW / 2, by = 104;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(bx - 28, by - 8, 56, 16, 4, 4, "F");
  setFont(doc, 11, "bold", sColor as [number, number, number]);
  doc.text(`Risk Score: ${score} / 100   Grade: ${grade}`, bx, by + 1, { align: "center" });

  // White content area
  doc.setFillColor(...C.white);
  doc.rect(0, 120, PW, PH - 120, "F");

  // Severity breakdown cards (row)
  const sevKeys = ["critical","high","medium","low","informational"];
  const cardW = 34, cardH = 26, cardY = 128, gap = 2.5;
  const totalW = sevKeys.length * cardW + (sevKeys.length - 1) * gap;
  let cx2 = (PW - totalW) / 2;

  for (const sev of sevKeys) {
    const n = counts[sev] ?? 0;
    const sc = sevColor(sev);
    doc.setFillColor(sc[0], sc[1], sc[2], 0.08);
    doc.setDrawColor(...sc);
    doc.setLineWidth(0.5);
    doc.roundedRect(cx2, cardY, cardW, cardH, 2, 2, "FD");
    setFont(doc, 18, "bold", sc as [number, number, number]);
    doc.text(String(n), cx2 + cardW / 2, cardY + 14, { align: "center" });
    setFont(doc, 7, "normal", sc as [number, number, number]);
    doc.text(sevLabel(sev), cx2 + cardW / 2, cardY + 21, { align: "center" });
    cx2 += cardW + gap;
  }

  // Stats row
  const statsY = cardY + cardH + 10;
  const statsData = [
    ["Files Scanned",   String(job.stats?.fileCount   ?? "—")],
    ["Context",         `${job.stats?.contextSizeKb   ?? "—"} KB`],
    ["Total Findings",  String(findings.length)],
    ["Scan Date",       dateStr],
  ];
  const colW = CW / statsData.length;
  for (let i = 0; i < statsData.length; i++) {
    const [label, val] = statsData[i];
    setFont(doc, 7.5, "normal", C.mutedText);
    doc.text(label, ML + i * colW + colW / 2, statsY, { align: "center" });
    setFont(doc, 11, "bold", C.darkText);
    doc.text(val, ML + i * colW + colW / 2, statsY + 7, { align: "center" });
  }

  hline(doc, statsY + 14, C.border);

  // Disclaimer
  setFont(doc, 8, "italic", C.mutedText);
  const disc = "This report was generated by S_A-H ULTIMATE using Gemini 2.5 Flash and Groq Llama 3. " +
               "Findings should be validated by a qualified security professional before remediation.";
  wrapText(doc, disc, ML, statsY + 22, CW, 4.5);

  /* ═════════════════════════════════════════════════════════════
     PAGE 2 — EXECUTIVE SUMMARY
  ═══════════════════════════════════════════════════════════════ */
  doc.addPage();
  pageHeader(doc, job.repoUrl);

  let y = 22;
  setFont(doc, 16, "bold", C.darkText);
  doc.text("Executive Summary", ML, y); y += 8;
  hline(doc, y); y += 8;

  // Risk score panel
  doc.setFillColor(sColor[0], sColor[1], sColor[2], 0.07);
  doc.setDrawColor(...sColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, 24, 3, 3, "FD");
  setFont(doc, 11, "bold", sColor as [number, number, number]);
  doc.text(`Overall Risk Score: ${score} / 100  —  Grade ${grade}`, ML + 6, y + 10);
  setFont(doc, 9, "normal", C.mutedText);
  doc.text(`${findings.length} vulnerabilities found across ${Object.keys(counts).length} severity levels.`, ML + 6, y + 18);
  y += 32;

  // Findings breakdown table
  setFont(doc, 10, "bold", C.darkText);
  doc.text("Finding Breakdown by Severity", ML, y); y += 6;

  const tHeaders = ["Severity", "Count", "Risk Weight", "Score Impact"];
  const tWeights: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3, informational: 1 };
  const colWidths = [45, 25, 35, 45];
  const rowH = 9;

  // Table header
  doc.setFillColor(...C.blue);
  doc.rect(ML, y, CW, rowH, "F");
  setFont(doc, 8, "bold", C.white);
  let tx = ML + 3;
  for (let i = 0; i < tHeaders.length; i++) {
    doc.text(tHeaders[i], tx, y + 6);
    tx += colWidths[i];
  }
  y += rowH;

  // Table rows
  for (const sev of sevKeys) {
    const n = counts[sev] ?? 0;
    if (n === 0) continue;
    const sc = sevColor(sev);
    doc.setFillColor(sc[0], sc[1], sc[2], 0.05);
    doc.rect(ML, y, CW, rowH, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.rect(ML, y, CW, rowH);

    tx = ML + 3;
    setFont(doc, 8, "bold", sc as [number, number, number]);
    doc.text(sev.charAt(0).toUpperCase() + sev.slice(1), tx, y + 6); tx += colWidths[0];
    setFont(doc, 8, "normal", C.darkText);
    doc.text(String(n), tx + colWidths[1] / 2, y + 6, { align: "center" }); tx += colWidths[1];
    doc.text(`−${tWeights[sev] ?? 1} per finding`, tx, y + 6); tx += colWidths[2];
    const impact = Math.min(100, n * (tWeights[sev] ?? 1));
    setFont(doc, 8, "bold", sc as [number, number, number]);
    doc.text(`−${impact} pts`, tx, y + 6);
    y += rowH;
  }

  // Score formula
  y += 6;
  setFont(doc, 8, "italic", C.mutedText);
  doc.text(`Score formula: 100 − Σ(severity × weight), clamped to [0, 100].`, ML, y);
  y += 12;

  // Severity guide
  hline(doc, y); y += 8;
  setFont(doc, 10, "bold", C.darkText);
  doc.text("Severity Guide", ML, y); y += 7;

  const guide = [
    ["Critical", "Immediate exploitation possible, funds at risk or system compromise.", C.critical],
    ["High",     "Significant vulnerability, likely exploitable with moderate effort.",  C.high],
    ["Medium",   "Security weakness with conditional exploitation requirements.",         C.medium],
    ["Low",      "Minor issue with limited real-world impact.",                           C.low],
    ["Info",     "Best practice violation or informational observation.",                 C.info],
  ] as const;

  for (const [sev, desc, col] of guide) {
    const pw2 = pill(doc, ML, y + 1, sev.toUpperCase(), col as unknown as RGB);
    setFont(doc, 8, "normal", C.darkText);
    doc.text(desc, ML + pw2 + 2, y + 1);
    y += 7;
  }

  /* ═════════════════════════════════════════════════════════════
     PAGES 3+ — FINDING DETAILS
  ═══════════════════════════════════════════════════════════════ */
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    doc.addPage();
    pageHeader(doc, job.repoUrl);
    y = 22;

    // Finding title bar
    const sc = sevColor(f.severity);
    doc.setFillColor(sc[0], sc[1], sc[2], 0.1);
    doc.setDrawColor(...sc);
    doc.setLineWidth(0.6);
    doc.roundedRect(ML, y, CW, 20, 3, 3, "FD");

    setFont(doc, 7.5, "bold", C.white);
    pill(doc, ML + 4, y + 8, sevLabel(f.severity), sc as RGB);

    setFont(doc, 10, "bold", C.darkText);
    doc.text(`${i + 1}. ${f.title}`, ML + 30, y + 8);

    if (f.id) {
      setFont(doc, 7, "normal", C.mutedText);
      doc.text(`Finding ID: ${f.id}`, ML + 30, y + 15);
    }
    y += 28;

    // Description
    setFont(doc, 9, "bold", C.darkText);
    doc.text("Description", ML, y); y += 5;
    setFont(doc, 8.5, "normal", C.darkText);
    y = wrapText(doc, f.description, ML, y, CW, 5);
    y += 4;

    // Affected code
    if (f.affectedCode) {
      if (y > PH - 60) { doc.addPage(); pageHeader(doc, job.repoUrl); y = 22; }
      setFont(doc, 9, "bold", C.darkText);
      doc.text("Affected Code", ML, y); y += 4;
      y = codeBlock(doc, f.affectedCode, y);
    }

    // PoC
    if (f.poc) {
      if (y > PH - 60) { doc.addPage(); pageHeader(doc, job.repoUrl); y = 22; }
      setFont(doc, 9, "bold", C.darkText);
      doc.text("Proof of Concept (Foundry Test)", ML, y); y += 2;

      // Source badge
      const pocSrc = f.pocSource === "groq" ? "Groq Llama 3" : f.pocSource === "sambanova" ? "SambaNova 405B" : "AI Generated";
      setFont(doc, 7.5, "normal", C.mutedText);
      doc.text(`Generated by: ${pocSrc}`, ML, y + 4); y += 8;
      y = codeBlock(doc, f.poc, y, 120);
    }

    // Remediation advice
    if (y > PH - 40) { doc.addPage(); pageHeader(doc, job.repoUrl); y = 22; }
    y += 2;
    hline(doc, y, C.border, 0.2); y += 6;
    setFont(doc, 9, "bold", C.darkText);
    doc.text("Recommended Remediation", ML, y); y += 5;
    setFont(doc, 8.5, "normal", C.mutedText);
    const remediation = getRemediation(f.severity);
    y = wrapText(doc, remediation, ML, y, CW, 5);
  }

  /* Page footers */
  pageFooter(doc);

  /* Save */
  const fileName = `SAH-Audit-${repoShort.replace(/\//g, "_").slice(0, 40)}-${Date.now()}.pdf`;
  doc.save(fileName);
}

function getRemediation(severity: string): string {
  const map: Record<string, string> = {
    critical: "Apply an immediate patch and halt any affected contract interactions. Conduct a full code freeze " +
              "and engage an independent auditor. Consider a bug bounty disclosure. Deploy a patched version " +
              "with an upgrade proxy if architecture permits.",
    high:     "Prioritise this fix in the next sprint. Add unit tests and invariant tests covering the attack " +
              "vector before deploying to mainnet. Review all contracts that share the same code pattern.",
    medium:   "Schedule for remediation within 2 weeks. Add regression tests to prevent reintroduction. " +
              "Evaluate whether a workaround can be deployed immediately to reduce exposure.",
    low:      "Address in the next scheduled maintenance window. Consider adding static-analysis rules to " +
              "catch this pattern automatically in CI/CD pipelines.",
    informational: "Review and update developer guidelines or documentation to reflect best practices. " +
                   "No immediate action required for security.",
  };
  return map[severity] ?? map.informational;
}
