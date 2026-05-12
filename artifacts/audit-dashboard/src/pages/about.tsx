import { Shield, Mail, Github, Linkedin, Twitter, ExternalLink, Zap, Code2, FileSearch, Bug } from "lucide-react";

const STACK = [
  { label: "AI Engine",    value: "Gemini 2.5 Flash + Groq Llama 3 + SambaNova 405B" },
  { label: "Frontend",     value: "React 18 + Vite + Tailwind CSS + shadcn/ui" },
  { label: "Backend",      value: "Node.js 24 + Express 5 + TypeScript 5.9" },
  { label: "API Layer",    value: "OpenAPI 3.1 → Orval codegen → React Query" },
  { label: "PoC Engine",   value: "Foundry-compatible Solidity exploit generator" },
  { label: "Data Sources", value: "Sherlock + Code4rena live contest feeds via GitHub" },
];

const FEATURES = [
  "10-lens Human+AI Hybrid Audit (Reentrancy, Oracle, Access Control, Flash Loan…)",
  "Automatic Foundry PoC exploit generation per finding",
  "Live contest radar — Sherlock & Code4rena",
  "Security Risk Score (0–100) with SVG gauge",
  "Professional PDF audit report export",
  "3-second AJAX polling — no page refresh",
  "Copy PoC + Copy Finding buttons",
  "JSON & PDF export with full finding details",
];

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-2">

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-border p-8 text-center"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">S_A-H ULTIMATE</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
          A professional-grade Web3 smart contract security audit dashboard powered by a
          Gemini 2.5 Flash + Groq + SambaNova AI pipeline.
          Built to help security researchers find exploits faster.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-600">Live · Actively maintained</span>
        </div>
      </div>

      {/* Developer Card */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>

        {/* Blue header band */}
        <div className="h-20 bg-gradient-to-r from-blue-600 to-blue-500" />

        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <div className="h-20 w-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center"
              style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
              <span className="text-2xl font-bold text-primary select-none">AH</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground">Adil Hussain</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Smart Contract Security Researcher · Web3 Developer
          </p>

          <div className="mt-5 space-y-2.5">
            {[
              {
                icon: Mail,
                label: "Email",
                value: "adilcryptonews@gmail.com",
                href: "mailto:adilcryptonews@gmail.com",
              },
              {
                icon: Twitter,
                label: "X (Twitter)",
                value: "@HUSAIN3413",
                href: "https://x.com/HUSAIN3413",
              },
              {
                icon: Github,
                label: "GitHub",
                value: "tokenanalyzer",
                href: "https://github.com/tokenanalyzer",
              },
              {
                icon: Linkedin,
                label: "LinkedIn",
                value: "Adil Hussain",
                href: "https://linkedin.com/in/adil-hussain",
              },
            ].map(({ icon: Icon, label, value, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-all duration-150 group"
              >
                <div className="h-8 w-8 rounded-lg bg-white border border-border flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{value}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl border border-border p-6"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Key Features</h3>
        </div>
        <ul className="space-y-2">
          {FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Tech stack */}
      <div className="bg-white rounded-2xl border border-border p-6"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tech Stack</h3>
        </div>
        <div className="space-y-2.5">
          {STACK.map(({ label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="text-xs font-semibold text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
              <span className="text-xs text-foreground leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <FileSearch className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> S_A-H ULTIMATE is a research tool. All findings should be validated by a
          qualified security professional before use in a real audit report. The developer is not liable for
          decisions made based on AI-generated output.
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        S_A-H ULTIMATE · Built with ❤️ by Adil Hussain · {new Date().getFullYear()}
      </p>
    </div>
  );
}
