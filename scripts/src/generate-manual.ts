import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const OUT = path.resolve(__dirname, "../../SAH_User_Manual.pdf");
const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "S_A-H ULTIMATE User Manual", Author: "S_A-H Security", Subject: "Web3 Security Audit Dashboard — User Manual & Troubleshooting Guide" } });
const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

/* ── colour palette ──────────────────────────────────────────────────────── */
const C = { primary: "#1d4ed8", accent: "#059669", warn: "#d97706", danger: "#dc2626", dark: "#111827", mid: "#374151", muted: "#6b7280", light: "#f3f4f6", white: "#ffffff", purple: "#7c3aed", teal: "#0d9488" };

/* ── helpers ─────────────────────────────────────────────────────────────── */
const W  = 595 - 100; // usable width
const lh = (n: number) => n * 14;

function pageY() { return (doc as any).y; }

function ensureSpace(needed: number) {
  if (pageY() + needed > 780) doc.addPage();
}

function rule(color = C.primary, y?: number) {
  const yy = y ?? pageY();
  doc.moveTo(50, yy).lineTo(545, yy).strokeColor(color).lineWidth(0.5).stroke();
  doc.moveDown(0.4);
}

function badge(label: string, bg: string, fg = C.white) {
  const tw = doc.widthOfString(label) + 12;
  const y  = pageY();
  doc.roundedRect(50, y, tw, 16, 4).fillColor(bg).fill();
  doc.fillColor(fg).fontSize(8).font("Helvetica-Bold").text(label, 56, y + 3.5, { lineBreak: false });
  doc.moveDown(0.15);
}

function h1(txt: string) {
  ensureSpace(60);
  doc.moveDown(0.6);
  doc.roundedRect(50, pageY(), W, 30, 6).fillColor(C.primary).fill();
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(15).text(txt, 62, pageY() - 28 + 6);
  doc.moveDown(0.8);
  doc.fillColor(C.dark);
}

function h2(txt: string, color = C.primary) {
  ensureSpace(40);
  doc.moveDown(0.5);
  doc.fillColor(color).font("Helvetica-Bold").fontSize(13).text(txt, 50);
  rule(color);
  doc.fillColor(C.dark);
}

function h3(txt: string, color = C.mid) {
  ensureSpace(30);
  doc.moveDown(0.3);
  doc.fillColor(color).font("Helvetica-Bold").fontSize(11).text("▸ " + txt, 50);
  doc.fillColor(C.dark);
}

function body(txt: string, indent = 0) {
  doc.fillColor(C.dark).font("Helvetica").fontSize(10).text(txt, 50 + indent, undefined, { width: W - indent, lineGap: 2 });
  doc.moveDown(0.15);
}

function hi(txt: string) {   // Hinglish highlight
  doc.fillColor(C.purple).font("Helvetica-Oblique").fontSize(10).text(txt, 50, undefined, { width: W, lineGap: 2 });
  doc.fillColor(C.dark);
  doc.moveDown(0.15);
}

function bullet(items: string[], indent = 14) {
  for (const it of items) {
    ensureSpace(18);
    doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(10).text("•", 50 + indent - 10, pageY(), { lineBreak: false });
    doc.fillColor(C.dark).font("Helvetica").fontSize(10).text(it, 50 + indent, pageY(), { width: W - indent, lineGap: 2 });
    doc.moveDown(0.1);
  }
  doc.moveDown(0.2);
}

function numberedList(items: string[], indent = 14) {
  items.forEach((it, i) => {
    ensureSpace(20);
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(10).text(`${i + 1}.`, 50 + indent - 14, pageY(), { lineBreak: false, width: 14 });
    doc.fillColor(C.dark).font("Helvetica").fontSize(10).text(it, 50 + indent, pageY(), { width: W - indent, lineGap: 2 });
    doc.moveDown(0.15);
  });
  doc.moveDown(0.2);
}

function tip(label: string, txt: string, bg: string, fg = C.white) {
  ensureSpace(40);
  doc.moveDown(0.3);
  const y = pageY();
  doc.roundedRect(50, y, W, 34, 5).fillColor(bg).fill();
  doc.fillColor(fg).font("Helvetica-Bold").fontSize(9).text(label, 58, y + 6, { lineBreak: false });
  doc.fillColor(fg).font("Helvetica").fontSize(9).text(txt, 58, y + 18, { width: W - 16, lineBreak: false });
  doc.moveDown(1.6);
}

function codeBlock(lines: string[]) {
  ensureSpace(lines.length * 14 + 20);
  doc.moveDown(0.3);
  const y = pageY();
  const h = lines.length * 13 + 14;
  doc.roundedRect(50, y, W, h, 4).fillColor("#1e293b").fill();
  lines.forEach((l, i) => {
    doc.fillColor("#86efac").font("Courier").fontSize(8.5).text(l, 60, y + 7 + i * 13, { lineBreak: false });
  });
  doc.moveDown(h / 14 + 0.6);
}

function infoBox(title: string, items: string[], bg = C.light, fg = C.primary) {
  ensureSpace(items.length * 16 + 30);
  doc.moveDown(0.3);
  const y0 = pageY();
  const h  = items.length * 14 + 28;
  doc.roundedRect(50, y0, W, h, 5).fillColor(bg).fill();
  doc.fillColor(fg).font("Helvetica-Bold").fontSize(10).text(title, 60, y0 + 8);
  items.forEach((it, i) => {
    doc.fillColor(C.dark).font("Helvetica").fontSize(9.5).text(it, 60, y0 + 22 + i * 14, { width: W - 20, lineBreak: false });
  });
  doc.moveDown(h / 14 + 0.4);
}

function twoCol(rows: [string, string][], hdr?: [string, string]) {
  ensureSpace(rows.length * 18 + 30);
  doc.moveDown(0.3);
  const col1 = 200, col2 = W - col1;
  let y = pageY();
  if (hdr) {
    doc.roundedRect(50, y, W, 18, 3).fillColor(C.primary).fill();
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9).text(hdr[0], 56, y + 4, { lineBreak: false, width: col1 - 6 });
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9).text(hdr[1], 56 + col1, y + 4, { lineBreak: false, width: col2 });
    y += 18;
  }
  rows.forEach(([a, b], i) => {
    const bg = i % 2 === 0 ? "#f9fafb" : C.white;
    doc.rect(50, y, W, 16).fillColor(bg).fill();
    doc.fillColor(C.dark).font("Helvetica").fontSize(9).text(a, 56, y + 3, { lineBreak: false, width: col1 - 6 });
    doc.fillColor(C.mid).font("Helvetica").fontSize(9).text(b, 56 + col1, y + 3, { lineBreak: false, width: col2 });
    y += 16;
  });
  doc.rect(50, pageY(), W, y - pageY()).strokeColor("#e5e7eb").lineWidth(0.4).stroke();
  doc.y = y + 4;
  doc.moveDown(0.3);
}

/* ═══════════════════════════════════════════════════════════════════════════
   COVER PAGE
═══════════════════════════════════════════════════════════════════════════ */
doc.rect(0, 0, 595, 842).fillColor(C.primary).fill();
doc.rect(0, 680, 595, 162).fillColor("#1e3a8a").fill();
doc.rect(0, 670, 595, 12).fillColor(C.accent).fill();

// Shield logo area
doc.circle(297, 160, 70).fillColor("#1e3a8a").fill();
doc.circle(297, 160, 65).strokeColor(C.accent).lineWidth(2).stroke();
doc.fillColor(C.white).font("Helvetica-Bold").fontSize(36).text("S_A-H", 0, 140, { align: "center" });
doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(12).text("SECURITY AUDIT HUB", 0, 180, { align: "center" });

doc.fillColor(C.white).font("Helvetica-Bold").fontSize(26).text("ULTIMATE", 0, 250, { align: "center" });
doc.fillColor("#93c5fd").font("Helvetica").fontSize(13).text("Web3 Security Audit Dashboard", 0, 282, { align: "center" });

doc.rect(100, 310, 395, 1.5).fillColor(C.accent).fill();

doc.fillColor(C.white).font("Helvetica-Bold").fontSize(18).text("User Manual &", 0, 328, { align: "center" });
doc.fillColor(C.white).font("Helvetica-Bold").fontSize(18).text("Troubleshooting Guide", 0, 352, { align: "center" });

doc.fillColor("#bfdbfe").font("Helvetica-Oblique").fontSize(12).text("(Hinglish Edition — Hindi + English)", 0, 386, { align: "center" });

// stats strip
const stats = [["24+", "Bounty Programs"], ["10", "Security Lenses"], ["3", "AI Models"], ["3", "Platforms"]];
stats.forEach(([val, lbl], i) => {
  const x = 70 + i * 115;
  doc.roundedRect(x, 430, 100, 52, 6).fillColor("#1e3a8a").fill();
  doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(20).text(val, x, 438, { width: 100, align: "center", lineBreak: false });
  doc.fillColor("#bfdbfe").font("Helvetica").fontSize(8).text(lbl, x, 462, { width: 100, align: "center", lineBreak: false });
});

doc.fillColor("#93c5fd").font("Helvetica").fontSize(10).text("Version 3.0  •  May 2025  •  For Professional Use Only", 0, 706, { align: "center" });
doc.fillColor("#bfdbfe").font("Helvetica").fontSize(9).text("www.sah-ultimate.app  •  Built for Indian Web3 Security Researchers", 0, 724, { align: "center" });

/* ═══════════════════════════════════════════════════════════════════════════
   TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
doc.rect(0, 0, 595, 50).fillColor(C.primary).fill();
doc.fillColor(C.white).font("Helvetica-Bold").fontSize(16).text("Table of Contents / विषय-सूची", 50, 16);

doc.moveDown(1.2);
const toc = [
  ["1", "Introduction — S_A-H ULTIMATE kya hai?", "3"],
  ["2", "Function Guide — Har Section ka Guide", "4"],
  ["  2.1", "Contest Radar — Live Bounty Data", "4"],
  ["  2.2", "AI Scanner — Human+AI Hybrid Engine", "5"],
  ["  2.3", "10 Security Lenses — Detection Guide", "6"],
  ["  2.4", "Reports & PoC — PDF Export & Code", "7"],
  ["3", "How to Work — Audit Start to Finish", "8"],
  ["4", "Troubleshooting — Error Solving Guide", "9"],
  ["  4.1", "Git Clone Fail — GitHub Token Fix", "9"],
  ["  4.2", "Groq/SambaNova Fail — AI Fallback", "10"],
  ["  4.3", "APK Build Errors — Android Setup", "10"],
  ["5", "Maintenance — API Keys Update Guide", "11"],
  ["6", "Quick Reference — Cheat Sheet", "12"],
];

toc.forEach(([num, title, pg]) => {
  ensureSpace(20);
  const y = pageY();
  const isMain = !num.startsWith(" ");
  doc.fillColor(isMain ? C.primary : C.mid).font(isMain ? "Helvetica-Bold" : "Helvetica").fontSize(isMain ? 11 : 10)
     .text(num, 50, y, { lineBreak: false, width: 30 });
  doc.fillColor(isMain ? C.dark : C.mid).font(isMain ? "Helvetica-Bold" : "Helvetica").fontSize(isMain ? 11 : 10)
     .text(title, 80, y, { lineBreak: false, width: 390 });
  const dots = ".".repeat(Math.max(2, 60 - title.length));
  doc.fillColor("#d1d5db").font("Helvetica").fontSize(10).text(dots, 80, y, { lineBreak: false, width: 400, align: "right" });
  doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(10).text(pg, 520, y, { lineBreak: false });
  doc.moveDown(isMain ? 0.6 : 0.4);
  if (isMain) rule(C.light);
});

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 1 — INTRODUCTION
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
h1("SECTION 1 — Introduction / परिचय");

body("S_A-H ULTIMATE (Security Audit Hub — Ultimate) ek advanced Web3 security audit dashboard hai jo specifically Indian blockchain security researchers ke liye banaya gaya hai. Yeh tool aapko smart contract vulnerabilities dhundhne mein, live bug bounty programs track karne mein, aur AI-powered security reports generate karne mein help karta hai.");

doc.moveDown(0.4);
hi("\"Ek tool jo aapka audit workflow professionally manage kare — from finding contests to generating PoC exploits.\"");

h2("🎯 Purpose / Uddeshy");
bullet([
  "Smart Contract Code mein security vulnerabilities automatically detect karna",
  "Immunefi, HackenProof, aur Cantina se live bug bounty programs fetch karna",
  "AI (Groq, SambaNova, Gemini) se Proof-of-Concept exploit code generate karna",
  "Professional PDF audit reports export karna jo directly submit kar sako",
  "India-friendly KYC programs (Aadhaar, PAN, Passport) filter karna",
]);

h2("🛡️ Key Features at a Glance");
twoCol([
  ["Contest Radar", "Live bounty programs Immunefi/HackenProof/Cantina se"],
  ["AI Scanner", "10 security lenses + 3 AI model fallback chain"],
  ["PoC Generator", "Groq → SambaNova → Gemini automatic fallback"],
  ["PDF Export", "Professional audit reports with findings & severity"],
  ["GitHub Integration", "Direct repo clone with auth token support"],
  ["India KYC Filter", "Aadhaar, PAN, Passport friendly programs first"],
  ["APK Support", "Capacitor-based Android app build support"],
  ["Offline Mode", "Curated data fallback when APIs unavailable"],
], ["Feature", "Description"]);

infoBox("⚡ Tech Stack (aapko pata hona chahiye):", [
  "• Frontend: React + Vite + TypeScript — modern web dashboard",
  "• Backend: Express.js (Node.js) — API server port 8080",
  "• AI Models: Groq (primary) → SambaNova → Gemini 2.5 Flash (fallback chain)",
  "• Bounty Scraper: Live API + 10-min cache + curated fallback",
  "• Mobile: Capacitor v8 — Android APK support",
], "#eff6ff", C.primary);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2 — FUNCTION GUIDE
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
h1("SECTION 2 — Function Guide / Har Section ka Guide");

/* 2.1 Contest Radar */
h2("2.1  Contest Radar — Live Bounty Data", C.accent);
body("Contest Radar aapka main hunting ground hai. Yahan se aap live audit contests aur bug bounty programs dhundh sakte ho.");

h3("Kaise Kaam Karta Hai (How it Works)");
numberedList([
  "Jab aap Radar page open karte ho, dashboard API server se request bhejta hai",
  "API server Immunefi, HackenProof, aur Cantina ke endpoints hit karta hai",
  "Agar live data milta hai → green 'Live API' badge show hoga top-right mein",
  "Agar koi platform block karta hai → amber 'Curated' badge aata hai (fallback)",
  "Data 10 minutes ke liye cache hota hai — unnecessary API calls avoid karne ke liye",
]);

h3("Filters ka Use Kaise Karo");
twoCol([
  ["All", "Sab platforms ke contests + bounty programs ek saath"],
  ["Sherlock", "Sirf Sherlock audit contest platform"],
  ["Code4rena", "Sirf Code4rena (C4) contests"],
  ["Immunefi", "Immunefi bug bounty programs only ($10M MakerDAO tak)"],
  ["HackenProof", "HackenProof programs (1inch, NEAR Protocol, etc.)"],
  ["Cantina", "Cantina private/public contest programs"],
  ["Active / Upcoming / Ended", "Contest status se filter (sirf live contests ke liye)"],
], ["Filter Button", "Kya Dikhta Hai"]);

tip("💡 Pro Tip:", "Immunefi filter lagao aur max bounty dekho — $10M+ programs pe focus karo. Unki scope files carefully padho.", C.accent);
tip("🇮🇳 India KYC:", "Har program card pe 'India KYC ✓' badge dikhega. Iska matlab us program mein Aadhaar/PAN/Passport se KYC ho sakti hai.", C.teal);

h3("Scan This Repo Button");
body("Kisi bhi contest card pe 'Scan This Repo' click karo — yeh automatically AI Scanner page pe redirect karega aur GitHub repo URL fill kar dega. Direct scanning shuru kar sakte ho!");

/* 2.2 AI Scanner */
doc.addPage();
h2("2.2  AI Scanner — Human+AI Hybrid Engine", C.primary);
body("AI Scanner S_A-H ULTIMATE ka core feature hai. Yeh GitHub repositories ko automatically clone karta hai, Solidity/Rust/Vyper code analyze karta hai, aur AI se vulnerabilities detect karta hai.");

h3("Human+AI Hybrid Approach kya hai?");
infoBox("Why 'Hybrid' Engine?", [
  "Pure AI scanning mein false positives zyada hote hain — AI kabhi kabhi galat vulnerabilities report karta hai.",
  "Human+AI Hybrid mein: AI 10 structured security lenses se code analyze karta hai (pre-defined patterns),",
  "phir human-readable findings generate karta hai jo aap verify kar sako before report submit karna.",
  "Result: Professional-grade findings with context — sirf noise nahi.",
], "#f0fdf4", C.accent);

h3("Step-by-Step: Scanner Use Karna");
numberedList([
  "GitHub repo URL copy karo (contest ka repo ya koi bhi public Solidity project)",
  "AI Scanner page pe jaao (left sidebar mein 'Scanner' click karo)",
  "GitHub URL paste karo URL input field mein",
  "Optional: apna GitHub Personal Access Token daalo (private repos ya rate limit ke liye)",
  "'Start Scan' button click karo — backend repo clone karta hai",
  "Progress bar dikhega: Clone → Parse → Analyze (10 lenses) → Generate Report",
  "Scan complete hone ke baad Findings section mein results aayenge",
  "Har finding pe click karo detail dekhne ke liye + AI-generated PoC code",
]);

h3("GitHub Token Kahan Se Milega?");
codeBlock([
  "# GitHub Personal Access Token banane ke steps:",
  "1. github.com → Settings → Developer settings",
  "2. Personal access tokens → Tokens (classic) → Generate new token",
  "3. Scopes: sirf 'repo' (read-only kafi hai public repos ke liye)",
  "4. Token copy karo — ek baar hi dikhta hai!",
  "5. Scanner mein GitHub Token field mein paste karo",
]);

tip("⚠️ Rate Limit Warning:", "Bina token ke GitHub sirf 60 requests/hour allow karta hai. Token ke saath 5000/hour milta hai. Ek din mein zyada scan karna ho toh token zaroor daalo.", C.warn, C.dark);

h3("AI Model Chain (Fallback System)");
body("Scanner 3 AI models use karta hai — ek fail ho toh automatically next pe switch hota hai:");
twoCol([
  ["1st: Groq (LLaMA 3)", "Primary model — fastest, best for code analysis"],
  ["2nd: SambaNova", "Fallback if Groq rate limited or API key missing"],
  ["3rd: Gemini 2.5 Flash", "Final fallback — Google ka powerful model"],
  ["Unavailable", "Agar teeno fail ho — manual analysis needed (rare)"],
], ["AI Model", "Role"]);

/* 2.3 Ten Security Lenses */
doc.addPage();
h2("2.3  10 Security Lenses — Kya Detect Karte Hain", C.purple);
body("S_A-H ULTIMATE ke scanner mein 10 specialized security lenses hain. Har lens ek specific vulnerability category pe focus karta hai.");

const lenses: [string, string, string][] = [
  ["01", "Reentrancy Guard", "External calls ke baad state changes — classic reentrancy attacks detect karta hai (jaise DAO hack)"],
  ["02", "Integer Overflow/Underflow", "Unchecked arithmetic operations — SafeMath use hua ya nahi check karta hai"],
  ["03", "Access Control", "onlyOwner, roles, modifiers — unauthorized function calls ki possibility check karta hai"],
  ["04", "Oracle Manipulation", "Price feeds aur on-chain oracles — spot price manipulation aur flash loan attacks"],
  ["05", "Flash Loan Attack Vectors", "Flash loan se ek transaction mein liquidity manipulation ki possibility"],
  ["06", "Front-Running / MEV", "Transaction ordering dependence — sandwich attacks aur MEV extraction vectors"],
  ["07", "Signature Replay", "EIP-712 signatures mein nonce/chainId check — replay attacks across chains"],
  ["08", "Logic Errors", "Business logic bugs — protocol math, fee calculations, edge cases mein galat assumptions"],
  ["09", "Gas Griefing", "Unbounded loops, DoS via gas exhaustion — griefing aur denial-of-service vectors"],
  ["10", "Upgrade Proxy Risks", "Transparent/UUPS proxy patterns — storage collisions aur uninitialized proxies"],
];

lenses.forEach(([num, name, desc]) => {
  ensureSpace(32);
  const y = pageY();
  doc.roundedRect(50, y, 30, 22, 4).fillColor(C.primary).fill();
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(10).text(num, 50, y + 5, { width: 30, align: "center", lineBreak: false });
  doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(10).text(name, 88, y + 1, { lineBreak: false });
  doc.fillColor(C.mid).font("Helvetica").fontSize(9).text(desc, 88, y + 13, { width: W - 38, lineBreak: false });
  doc.moveDown(1.5);
});

tip("🎯 Strategy:", "Reentrancy (01) aur Access Control (03) pe pehle focus karo — yeh sabse common high/critical findings hain aur sabse zyada bounty pay karte hain.", C.primary);

/* 2.4 Reports & PoC */
doc.addPage();
h2("2.4  Reports & PoC — PDF Export & PoC Code", C.teal);

h3("Scan Report kaise Export karo");
numberedList([
  "Scan complete hone ke baad Reports page pe jaao",
  "Apna scan select karo list mein se",
  "Top-right mein 'Export PDF' button click karo",
  "PDF generate hogi — browser mein download prompt aayega",
  "PDF mein hoga: findings list, severity breakdown, per-finding detail + PoC code",
]);

h3("PDF Report mein kya hota hai?");
bullet([
  "Executive Summary: Total findings, Critical/High/Medium/Low count",
  "Per Finding Detail: Title, Description, Vulnerable Code Snippet, Impact",
  "PoC Code: AI-generated Foundry/Hardhat test case jo vulnerability demonstrate karta hai",
  "Remediation: Fix suggestion aur best practice reference",
  "Audit Metadata: Repo URL, scan date, lenses used, AI model used",
]);

h3("PoC Code ko kaise Use Karen");
body("Generated PoC code Foundry test format mein hota hai. Yeh directly apne local environment mein run kar sakte ho:");
codeBlock([
  "# Prerequisites: Foundry install karo",
  "curl -L https://foundry.paradigm.xyz | bash && foundryup",
  "",
  "# PoC code copy karo PDF se ya dashboard se",
  "# Naya test file banao:",
  "touch test/SAH_PoC_Reentrancy.t.sol",
  "",
  "# PoC code paste karo file mein, phir run karo:",
  "forge test --match-test test_Reentrancy_PoC -vvvv",
  "",
  "# Agar test fail karta hai = vulnerability REAL hai",
  "# Agar test pass karta hai = false positive, discard karo",
]);

tip("💡 Before Submitting:", "Hamesha PoC locally run karo verify karne ke liye. False positives submit karne se reputation kharab hoti hai aur duplicate reports mark ho jaate hain.", C.warn, C.dark);

infoBox("📋 Report Submission Checklist:", [
  "✅ PoC code locally run karke verify kiya",
  "✅ Duplicate check: platform pe similar report pehle se submit nahi hai",
  "✅ Severity accurate hai (CVSS ya platform guidelines ke hisaab se)",
  "✅ Impact clearly describe kiya — real-world scenario ke saath",
  "✅ Remediation suggestion include kiya",
  "✅ KYC documents ready hain (Aadhaar/PAN/Passport)",
], "#f0fdf4", C.accent);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 3 — HOW TO WORK
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
h1("SECTION 3 — How to Work / Audit Start se Finish Tak");

body("Yeh complete workflow hai ek professional Web3 security audit karne ka — S_A-H ULTIMATE use karke. Is process ko follow karo ek bhi step miss mat karo.");

h2("Phase 1: Target Selection (Contest Dhundho)", C.accent);
numberedList([
  "Contest Radar page kholo",
  "Platform filter lagao — beginners ke liye Code4rena ya Sherlock best hain",
  "Status filter: 'Active' select karo — sirf chal rahe contests dikhenge",
  "Prize pool dekho: $50K+ contests pe focus karo (competition zyada, but reward bhi zyada)",
  "nSLOC (non-comment Source Lines of Code) dekho — 1000-5000 nSLOC ideal for beginners",
  "Contest ka README padhne ke liye external link icon click karo",
  "Scope files check karo: kaunse contracts in scope hain?",
]);
tip("🎯 Beginner Tip:", "Pehle ended contests dhundho aur unke reports padho (Sherlock ke reports public hote hain). Real findings ka pattern samjho pehle.", C.accent);

h2("Phase 2: Reconnaissance (Repo Explore Karo)", C.primary);
numberedList([
  "'Scan This Repo' click karo contest card pe — ya manually URL copy karo",
  "AI Scanner mein GitHub URL paste karo",
  "GitHub Token add karo (rate limiting avoid karne ke liye)",
  "Scan shuru karne se pehle: GitHub pe repo kholo aur README padho",
  "In-scope contracts list note karo (usually README ya scope.txt mein hoti hai)",
  "Contest ka Discord/Telegram join karo — sponsors kabhi kabhi hints dete hain",
]);

h2("Phase 3: Automated Scan (AI se Scan Karo)", C.purple);
numberedList([
  "'Start Scan' click karo",
  "Scan chal raha ho tab manually bhi code padho (parallel work karo)",
  "Progress: Clone → Parse → 10 Lenses Apply → AI Analysis → Report",
  "Scan complete hone ke baad findings list dekho",
  "Severity ke hisaab se sort karo: Critical → High → Medium → Low",
  "Har finding ke liye 'View Details' click karo — full context padho",
]);

h2("Phase 4: Manual Verification (Findings Verify Karo)", C.teal);
body("Yeh sabse important step hai — AI findings 100% accurate nahi hote:");
numberedList([
  "Har High/Critical finding ke liye original code file kholo",
  "AI ne jo vulnerable code bataya hai usse manually trace karo",
  "Question: 'Kya yeh actually exploitable hai?'",
  "PoC code local mein run karo (forge test command se)",
  "Agar exploit kaam karta hai → real finding hai, submit karo",
  "Agar kaam nahi karta → discard karo (false positive)",
  "Medium findings ke liye: edge cases socho (special conditions mein trigger ho sakta hai?)",
]);

h2("Phase 5: Report Submit Karo", C.danger);
numberedList([
  "PDF report export karo — yeh draft ke roop mein use karo",
  "Platform ka official submission form kholo (Sherlock/C4/Immunefi)",
  "Title likho: Clear aur specific (jaise 'Reentrancy in withdraw() allows drain of vault')",
  "Severity select karo (platform guidelines follow karo strictly)",
  "Impact explain karo: 'An attacker can...' format mein",
  "PoC code paste karo (verified wala sirf)",
  "Remediation suggest karo: 'Add nonReentrant modifier' jaisi specific fix",
  "Submit! Platform usually 1-2 weeks mein respond karta hai",
]);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4 — TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
h1("SECTION 4 — Troubleshooting / Error Solving Guide");

/* 4.1 Git Clone */
h2("4.1  Git Clone Fail — GitHub Token Fix", C.danger);

body("Scan shuru karne ke baad agar 'Git clone failed' error aata hai, toh yeh common causes aur fixes hain:");

h3("Diagnosis: Error Types");
twoCol([
  ["Repository not found (404)", "Repo private hai ya URL galat hai"],
  ["rate limit exceeded (403)", "GitHub API rate limit hit ho gaya (60/hr without token)"],
  ["Authentication failed", "Token expired ya galat scope set kiya"],
  ["timeout / connection refused", "Network issue ya GitHub down (rare)"],
  ["Permission denied (publickey)", "SSH URL use ki instead of HTTPS"],
], ["Error Message", "Cause"]);

h3("Fix Steps");
numberedList([
  "GitHub URL verify karo: https://github.com/username/repo format hona chahiye (SSH URL mat use karo)",
  "Repo access check karo: browser mein URL kholo — 404 aata hai toh repo private/deleted hai",
  "GitHub Token generate karo (agar nahi kiya): github.com → Settings → Developer settings → PAT",
  "Token scope: 'repo' permission select karo (read access kafi hai)",
  "Scanner ke GitHub Token field mein token paste karo",
  "Dobara scan shuru karo — ab kaam karna chahiye",
]);

codeBlock([
  "# Token test karne ka quick way (terminal mein):",
  "curl -H 'Authorization: token YOUR_TOKEN_HERE' https://api.github.com/rate_limit",
  "",
  "# Expected output mein ye dikhna chahiye:",
  "# 'limit': 5000",
  "# 'remaining': 4999   (ya koi bhi number > 0)",
  "",
  "# Agar 401 error aaye: token galat hai, regenerate karo",
  "# Agar 403 aaye: token ka scope galat hai (repo permission chahiye)",
]);

tip("⚠️ Important:", "GitHub Token ko secret rakho — kisi ke saath share mat karo. Agar share ho gaya toh immediately revoke karo: GitHub → Settings → Developer Settings → Delete Token.", C.danger);

/* 4.2 AI Failures */
doc.addPage();
h2("4.2  Groq / SambaNova Fail — AI Fallback Explanation", C.warn);

body("AI Scanner ek 3-tier fallback chain use karta hai. Agar ek fail ho toh automatically next pe switch hota hai:");
codeBlock([
  "Groq (Primary)  →  SambaNova (Fallback 1)  →  Gemini 2.5 Flash (Fallback 2)",
  "     ↓ fail               ↓ fail                        ↓ fail",
  "   Rate limit?      API key missing?              Check internet",
  "   Key expired?     Account suspended?            → Contact support",
]);

h3("API Key Errors aur Fix");
twoCol([
  ["Groq: invalid_api_key", "GROQ_API_KEY env variable set nahi hai ya galat hai"],
  ["Groq: rate_limit_exceeded", "Free tier limit hit — SambaNova pe auto-fallback hoga"],
  ["SambaNova: 401 Unauthorized", "SAMBANOVA_API_KEY missing ya expired"],
  ["Gemini: API_KEY_INVALID", "GEMINI_API_KEY ya VITE_GEMINI_API_KEY set nahi"],
  ["pocSource: unavailable", "Teeno models fail ho gaye — check all 3 keys"],
], ["Error", "Meaning"]);

h3("API Keys Set Karne Ka Tarika");
numberedList([
  "Replit project mein jaao → left sidebar mein 'Secrets' icon click karo (lock icon)",
  "New Secret add karo:",
  "   GROQ_API_KEY — groq.com se free account banao, API key copy karo",
  "   SAMBANOVA_API_KEY — sambanova.ai se key lo",
  "   GEMINI_API_KEY — aistudio.google.com se free Gemini key lo",
  "Keys save karo — workflow automatically restart karega",
  "Scanner dobara use karo — ab teeno models available honge",
]);

tip("💡 Free Keys:", "Groq aur Gemini dono free tier ke saath kafi generous hain daily limits ke liye. SambaNova bhi free tier provide karta hai. Teeno set karo guarantee ke liye ki koi na koi kaam kare.", C.accent);

/* 4.3 APK Build */
h2("4.3  APK Build Errors — Android Setup Guide", C.purple);

body("S_A-H ULTIMATE ko Android APK ke roop mein build kar sakte ho Capacitor v8 ke through. Yeh Replit pe directly nahi ho sakta — local machine pe karo.");

h3("Prerequisites (Pehle yeh install karo)");
bullet([
  "Node.js 18+ (node --version se check karo)",
  "Android Studio (developer.android.com/studio se download karo)",
  "Android SDK — Android Studio ke through install hota hai automatically",
  "Java JDK 17+ (Android Studio ke saath usually aata hai)",
  "pnpm (npm install -g pnpm)",
]);

h3("Common APK Build Errors aur Fix");
twoCol([
  ["ANDROID_HOME not set", "Android SDK path environment variable set karo"],
  ["SDK location not found", "local.properties file mein sdk.dir set karo"],
  ["Gradle build failed: license", "Android Studio kholo → SDK Manager → Accept licenses"],
  ["Could not resolve dependencies", "Internet check karo, proxy settings clear karo"],
  ["BUILD FAILED: compileSdkVersion", "Android Studio mein SDK 34+ install karo"],
  ["capacitor.config.json not found", "artifacts/audit-dashboard/ se cap commands run karo"],
  ["webDir 'dist/public' not found", "Pehle pnpm build run karo, phir cap sync karo"],
], ["Error", "Fix"]);

codeBlock([
  "# Android Studio install karne ke baad:",
  "export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS",
  "export ANDROID_HOME=$HOME/Android/Sdk           # Linux",
  "export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools",
  "",
  "# Project root se build commands:",
  "pnpm --filter @workspace/audit-dashboard run build",
  "cd artifacts/audit-dashboard",
  "npx cap sync android",
  "cd android && ./gradlew assembleDebug",
  "",
  "# APK location:",
  "android/app/build/outputs/apk/debug/app-debug.apk",
]);

tip("📱 Quick Test:", "APK install karne se pehle: adb install app-debug.apk se directly connected phone pe test karo. Sahi kaam kar raha hai toh release build banao.", C.teal);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5 — MAINTENANCE
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
h1("SECTION 5 — Maintenance / API Keys Future mein Update Karna");

h2("API Keys Kab aur Kaise Update Karo", C.primary);
body("API keys occasionally expire hoti hain ya limits hit ho jaati hain. Neeche complete guide hai future mein keys update karne ka:");

h3("Replit Environment Mein Keys Update Karna");
numberedList([
  "replit.com pe apna project kholo",
  "Left sidebar mein lock icon (🔒 Secrets) click karo",
  "Jo key update karni hai usse dhundho list mein",
  "Edit icon click karo → naya value paste karo",
  "Save karo — API server automatically restart hoga",
  "Dashboard mein scanner test karo confirm karne ke liye",
]);

h3("Kahan Se Free API Keys Milte Hain");
twoCol([
  ["Groq (GROQ_API_KEY)", "console.groq.com → API Keys → Create"],
  ["SambaNova (SAMBANOVA_API_KEY)", "cloud.sambanova.ai → API → Generate Key"],
  ["Gemini (GEMINI_API_KEY)", "aistudio.google.com → Get API Key → Free tier"],
  ["GitHub (GITHUB_TOKEN)", "github.com → Settings → Developer Settings → PAT"],
], ["Service", "Kahan Jaana Hai"]);

h3("Key Expiry ke Signs");
bullet([
  "Scanner mein 'AI unavailable' ya 'pocSource: unavailable' dikhne lagta hai",
  "All scans pe error aane lagte hain — no findings generated",
  "API server logs mein 401/403 errors dikhte hain",
  "GitHub rate limit bar continuously red/amber dikhta hai",
]);

h2("Regular Maintenance Schedule", C.accent);
twoCol([
  ["Monthly", "Groq aur SambaNova key rotation (security best practice)"],
  ["Every 3 months", "GitHub PAT renewal (token expiry avoid karne ke liye)"],
  ["When needed", "Gemini key — usually nahi expire hoti, but check karo agar issues hon"],
  ["After any breach", "Immediately revoke ALL keys aur regenerate karo"],
], ["Frequency", "Action"]);

infoBox("🔐 Security Best Practices for API Keys:", [
  "• Keys ko kabhi code mein directly nahi likhte — hamesha Secrets/env vars use karo",
  "• Keys kisi ke saath share mat karo — ek key = ek user",
  "• Agar key accidentally git mein commit ho jaaye: turant revoke karo, git history clean karo",
  "• Groq/SambaNova keys mein IP allowlist lagao agar option ho",
  "• Monthly ek bar dashboard kholo aur scanner test karo — ensure everything works",
], "#fef3c7", C.warn);

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6 — QUICK REFERENCE
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
h1("SECTION 6 — Quick Reference / Cheat Sheet");

h2("Keyboard & Navigation Quick Reference", C.primary);
twoCol([
  ["Dashboard Load → Radar", "Pehla page — live bounty programs"],
  ["Radar → Immunefi filter", "India-friendly max-bounty programs"],
  ["Radar → Contest card → 'Scan This Repo'", "Direct scanner launch with URL prefilled"],
  ["Scanner → GitHub URL + Token → Start Scan", "Full automated scan launch"],
  ["Findings → Click any finding", "Detail + PoC code view"],
  ["Reports → Export PDF", "Professional PDF report download"],
  ["About page", "App version, API status, model status"],
], ["Action", "What Happens"]);

h2("Severity Classification Guide", C.danger);
twoCol([
  ["Critical (9-10 CVSS)", "Direct fund loss, unauthorized mint/burn, full protocol drain"],
  ["High (7-8 CVSS)", "Significant fund loss possible, major access control bypass"],
  ["Medium (4-6 CVSS)", "Limited fund loss, temporary DoS, logic errors with conditions"],
  ["Low (1-3 CVSS)", "No fund loss, informational, best practice violations"],
  ["Informational (0)", "Code quality, gas optimization, style issues"],
], ["Severity Level", "Examples"]);

h2("Emergency Quick Fixes", C.danger);
twoCol([
  ["'Cannot connect to API'", "Browser refresh karo → agar persist: workflow restart karo"],
  ["'Git clone failed'", "GitHub token add karo (4.1 section dekho)"],
  ["'AI unavailable'", "API keys check karo (4.2 section dekho)"],
  ["'No programs found' in Radar", "Internet check karo — curated fallback normally handle karta hai"],
  ["APK build fails", "Android Studio SDK licenses accept karo (4.3 section dekho)"],
  ["PDF export not working", "Browser popup blocker disable karo for this site"],
  ["Scanner stuck at 0%", "Network tab check karo — API server running hai?"],
], ["Problem", "Quick Fix"]);

h2("Bounty Platform Comparison", C.teal);
twoCol([
  ["Immunefi", "$1K–$10M, DeFi focus, best payouts, strict KYC"],
  ["HackenProof", "$500–$1M, CeFi+DeFi, faster response, Aadhaar OK"],
  ["Cantina", "$5K–$2M, invite-based contests, quality > quantity"],
  ["Sherlock (via Radar)", "Contest format, $10K–$500K, community judging"],
  ["Code4rena (via Radar)", "Contest format, $5K–$1M, automated + manual judging"],
], ["Platform", "Details"]);

tip("🏆 Final Advice:", "Consistency beats everything. Ek contest pe weekly 10 ghante dene wala researcher consistently better results leta hai compared to occasional 40-hour sprint. S_A-H ULTIMATE aapka daily workflow tool hai.", C.primary);

/* ═══════════════════════════════════════════════════════════════════════════
   BACK COVER
═══════════════════════════════════════════════════════════════════════════ */
doc.addPage();
doc.rect(0, 0, 595, 842).fillColor("#0f172a").fill();
doc.rect(0, 400, 595, 2).fillColor(C.accent).fill();

doc.fillColor(C.accent).font("Helvetica-Bold").fontSize(30).text("S_A-H ULTIMATE", 0, 200, { align: "center" });
doc.fillColor(C.white).font("Helvetica").fontSize(14).text("Web3 Security Audit Dashboard", 0, 240, { align: "center" });
doc.fillColor("#64748b").font("Helvetica").fontSize(11).text("Version 3.0 — User Manual Complete", 0, 264, { align: "center" });

doc.fillColor(C.white).font("Helvetica-Bold").fontSize(13).text("Agar koi problem ho toh:", 0, 430, { align: "center" });
doc.fillColor("#94a3b8").font("Helvetica").fontSize(11)
   .text("1. Is manual ka relevant section dobara padho", 0, 454, { align: "center" })
   .text("2. API server logs check karo", 0, 472, { align: "center" })
   .text("3. API keys verify karo (Section 5 dekho)", 0, 490, { align: "center" })
   .text("4. Dashboard refresh karo", 0, 508, { align: "center" });

doc.fillColor("#334155").font("Helvetica").fontSize(9)
   .text("This manual is intended for professional security researchers only.", 0, 760, { align: "center" })
   .text("Always verify findings before submission. Responsible disclosure only.", 0, 775, { align: "center" })
   .text("© 2025 S_A-H Security — Built with ❤️ for Indian Web3 Researchers", 0, 792, { align: "center" });

/* ── Header/Footer on all pages ───────────────────────────────────────── */
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  const pageNum = i + 1;
  if (pageNum === 1) continue; // skip cover
  doc.switchToPage(i);
  // header
  doc.rect(0, 0, 595, 28).fillColor(C.primary).fill();
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8)
     .text("S_A-H ULTIMATE  —  User Manual & Troubleshooting Guide (Hinglish Edition)", 50, 9, { lineBreak: false });
  doc.fillColor("#93c5fd").font("Helvetica").fontSize(8)
     .text(`Page ${pageNum}`, 0, 9, { align: "right", width: 545, lineBreak: false });
  // footer
  doc.rect(0, 814, 595, 28).fillColor("#f8fafc").fill();
  doc.moveTo(0, 814).lineTo(595, 814).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
     .text("Version 3.0  |  For professional use only  |  © 2025 S_A-H Security", 50, 820, { lineBreak: false });
}

doc.end();
stream.on("finish", () => {
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`✅ SAH_User_Manual.pdf saved — ${kb} KB`);
});
