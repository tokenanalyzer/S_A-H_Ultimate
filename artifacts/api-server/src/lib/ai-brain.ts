import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { logger } from "./logger";

export type OnLog = (
  level: "SYSTEM" | "INFO" | "DEBUG" | "WARN" | "ERROR",
  message: string
) => void;

export interface RawFinding {
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  description: string;
  affectedCode: string | null;
}

export interface Finding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  description: string;
  affectedCode: string | null;
  poc: string;
  pocSource: "groq" | "sambanova" | "gemini" | "unavailable";
}

/* ═══════════════════════════════════════════════════════════════════════════
   HUMAN + AI HYBRID AUDIT PROMPT — 10 Pro Security Analysis Dimensions
═══════════════════════════════════════════════════════════════════════════ */
const GEMINI_SYSTEM_PROMPT = `You are an elite smart contract security researcher combining human intuition with systematic analysis. You have audited 500+ protocols on Code4rena, Sherlock, and Immunefi. You think like an attacker, not a linter.

MANDATORY: For every piece of code, think — "How would a skilled MEV bot or whitehacker exploit this for profit in a single transaction or across a few blocks?"

Analyse using ALL 10 of the following professional security lenses:

[1] REENTRANCY & CROSS-CONTRACT REENTRANCY
    - Check all external calls (call, transfer, delegatecall, interfaces)
    - Look for read-only reentrancy (view functions used in price calculations)
    - Trace multi-contract interaction flows for cross-function and cross-contract reentrancy
    - Check for ERC-777 / ERC-1155 callback hooks

[2] ORACLE MANIPULATION & PRICE ATTACKS
    - Spot-price dependencies manipulatable within one block (flash loan vectors)
    - TWAP window bypass on low-liquidity pools
    - Chainlink price feed staleness, missing heartbeat checks, zero-price checks
    - Single-source oracle without circuit breakers or deviation checks

[3] ACCESS CONTROL & PRIVILEGE ESCALATION
    - Missing or incorrect modifiers on state-changing functions
    - Unprotected initializer() or initialize() functions callable after deployment
    - Role confusion — address(0) as admin, transferOwnership without two-step
    - onlyOwner functions that create centralisation risk

[4] UPGRADE PROXY SAFETY (UUPS / Transparent / Diamond)
    - Storage slot collisions between proxy and implementation
    - Uninitialized implementation contracts (self-destruct risk)
    - Missing _authorizeUpgrade override
    - Function selector clashes in Diamond proxies

[5] GAS GRIEFING & DENIAL OF SERVICE
    - Unbounded loops over dynamic storage arrays (push-over-pull antipattern)
    - External calls inside loops — one revert blocks all
    - Block gas limit attacks on batch operations
    - Mapping or array growth proportional to number of users

[6] ARITHMETIC & PRECISION ERRORS
    - Integer division truncation before multiplication (precision loss in fee math)
    - Overflow/underflow on Solidity <0.8 without SafeMath
    - Incorrect decimal scaling between tokens of different decimals
    - Rounding direction errors in AMM / yield maths (always round against user)

[7] LOGIC FLAWS & BUSINESS LOGIC EXPLOITS (human-only insight)
    - Accounting invariant violations (totalSupply != sum of balances)
    - Incorrect order of operations that breaks economic assumptions
    - Fee-on-transfer / rebase token assumptions not accounted for
    - Incorrect reward calculation on partial withdraw/deposit

[8] FLASH LOAN & SINGLE-TRANSACTION ATTACK VECTORS
    - Price/balance checks that can be manipulated within one block
    - Borrow → manipulate → repay patterns against AMM or lending pools
    - totalAssets() or getReserve() used for price that can be sandwiched
    - Donation attacks against vault share price

[9] FRONT-RUNNING, MEV & TRANSACTION-ORDER DEPENDENCE
    - Predictable on-chain randomness (blockhash, timestamp as seed)
    - Sandwich attack surfaces in swap functions
    - approve() front-running — missing increaseAllowance
    - Commit-reveal schemes with extractable values

[10] KNOWN EXPLOIT SIGNATURES (pattern-match against real hacks)
    - Signature replay without nonce or chainId validation
    - ERC-20 permit() front-running
    - Unchecked return values from low-level calls
    - Incorrect event emission that misleads off-chain monitors
    - Missing slippage protection (minAmountOut == 0)

SEVERITY CALIBRATION (economic impact):
- critical: Direct theft of funds or protocol insolvency in one tx
- high:     Significant fund loss with moderate attacker effort
- medium:   Conditional exploit or protocol degradation
- low:      Minimal impact, best-practice violation
- informational: No direct security impact, code quality issue

IMPORTANT: Only report real, exploitable issues with a realistic attack scenario. Do NOT report:
- Compiler warnings without exploitability
- Theoretical issues with no practical impact
- Issues already mitigated by other code in scope

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Each element must have exactly these fields:
- title: string (specific, e.g. "Flash Loan Oracle Manipulation in liquidate() — $X at risk")
- severity: one of "critical", "high", "medium", "low", "informational"
- description: string (attack scenario, vector, economic impact, and root cause in 3-5 sentences)
- affectedCode: string or null (the exact vulnerable code snippet, max 20 lines)

If no vulnerabilities are found, return an empty array: []`;

/* ═══════════════════════════════════════════════════════════════════════════
   POC PROMPT — Foundry exploit specialist
═══════════════════════════════════════════════════════════════════════════ */
const POC_SYSTEM_PROMPT = `You are an expert Solidity security researcher who writes Foundry PoC exploits for real audit reports.
Generate a complete, working Foundry test that exploits the given vulnerability.
Return ONLY the Solidity code — no markdown fences, no explanation text.

The PoC must:
- Use Foundry test conventions: import {Test} from "forge-std/Test.sol"; setUp(); testExploit()
- Include a mock or minimal target contract if the real one is not available
- Use vm.prank(), deal(), vm.startPrank() as needed
- Include console.log() showing attacker profit/balance before and after
- Assert the exploit succeeded (e.g. assertGt(profit, 0) or assertEq(stolen, totalFunds))
- Add a // VULNERABILITY comment on the exact line being exploited
- Be self-contained — compilable with just forge-std`;

const SEVERITY_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

/* Helper: resolve key checking VITE_ prefix first, then bare name */
function resolveKey(name: string): string | undefined {
  return process.env[`VITE_${name}`] || process.env[name] || undefined;
}

function getGeminiKey(): string {
  const key = resolveKey("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY (or VITE_GEMINI_API_KEY) is not set");
  return key;
}

function getGroqKey(): string {
  const key = resolveKey("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY (or VITE_GROQ_API_KEY) is not set");
  return key;
}

function getSambanovaKey(): string {
  const key = resolveKey("SAMBANOVA_API_KEY");
  if (!key) throw new Error("SAMBANOVA_API_KEY (or VITE_SAMBANOVA_API_KEY) is not set");
  return key;
}

function getGeminiClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(getGeminiKey());
}

function getGroqClient(): Groq {
  return new Groq({ apiKey: getGroqKey() });
}

function getSambanovaClient(): OpenAI {
  return new OpenAI({
    apiKey: getSambanovaKey(),
    baseURL: "https://api.sambanova.ai/v1",
  });
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const arrStart = raw.indexOf("[");
  const arrEnd = raw.lastIndexOf("]");
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    return raw.slice(arrStart, arrEnd + 1);
  }
  return raw.trim();
}

function titleTokens(title: string): Set<string> {
  const STOPWORDS = new Set([
    "in", "the", "a", "an", "of", "to", "and", "or", "with", "via",
    "at", "by", "for", "on", "is", "are", "can", "be", "may", "due",
    "through", "from", "into", "within", "without", "that", "this",
  ]);
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((t) => b.has(t)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

export function deduplicateFindings(
  findings: RawFinding[],
  onLog: OnLog = () => {}
): RawFinding[] {
  const SIMILARITY_THRESHOLD = 0.55;
  const kept: RawFinding[] = [];

  for (const candidate of findings) {
    const tokensC = titleTokens(candidate.title);
    let isDuplicate = false;

    for (let i = 0; i < kept.length; i++) {
      const sim = jaccardSimilarity(tokensC, titleTokens(kept[i].title));
      if (sim >= SIMILARITY_THRESHOLD) {
        const rankC = SEVERITY_RANK[candidate.severity] ?? 0;
        const rankK = SEVERITY_RANK[kept[i].severity] ?? 0;
        if (rankC > rankK) {
          onLog(
            "DEBUG",
            `Dedup: replaced "${kept[i].title}" with higher-severity match "${candidate.title}" (sim=${sim.toFixed(2)})`
          );
          kept[i] = candidate;
        } else {
          onLog(
            "DEBUG",
            `Dedup: dropped duplicate "${candidate.title}" (sim=${sim.toFixed(2)} vs "${kept[i].title}")`
          );
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) kept.push(candidate);
  }

  const removed = findings.length - kept.length;
  if (removed > 0) {
    onLog("INFO", `Deduplicator: removed ${removed} duplicate finding${removed === 1 ? "" : "s"}`);
  }

  return kept;
}

export async function scanWithGemini(
  context: string,
  onLog: OnLog = () => {}
): Promise<RawFinding[]> {
  const gemini = getGeminiClient();
  const model = gemini.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: GEMINI_SYSTEM_PROMPT,
  });

  const MAX_CHARS = 800_000;
  const truncated = context.length > MAX_CHARS ? context.slice(0, MAX_CHARS) : context;
  const kb = Math.round(Buffer.byteLength(truncated, "utf-8") / 1024);

  onLog("SYSTEM", `Gemini 2.5 Flash — ingesting ${kb} KB of Solidity context`);
  onLog("INFO",   "Activating Human+AI Hybrid Audit Engine — 10 security lenses");
  onLog("INFO",   "[1/10] Reentrancy & cross-contract call graph analysis...");
  logger.info({ contextChars: truncated.length }, "Sending context to Gemini — hybrid audit mode");

  const result = await model.generateContent(
    `You are auditing the following Solidity codebase. Apply all 10 security lenses from your instructions. Focus especially on logic flaws and edge-case exploits that automated tools miss. Think like an attacker building a profitable exploit, not a linter checking syntax.\n\nCodebase:\n\n${truncated}`
  );

  const raw = result.response.text();
  onLog("DEBUG", "Gemini response received — parsing findings JSON");
  logger.info({ raw: raw.slice(0, 200) }, "Gemini raw response preview");

  try {
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as unknown[];

    const findings: RawFinding[] = [];
    for (const item of parsed) {
      if (
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "severity" in item &&
        "description" in item
      ) {
        const f = item as Record<string, unknown>;
        const sev = f.severity as string;
        if (!["critical", "high", "medium", "low", "informational"].includes(sev)) continue;
        findings.push({
          title: String(f.title),
          severity: sev as RawFinding["severity"],
          description: String(f.description),
          affectedCode:
            f.affectedCode && typeof f.affectedCode === "string"
              ? f.affectedCode
              : null,
        });
      }
    }

    onLog("SYSTEM", `Hybrid analysis complete — ${findings.length} exploitable issue${findings.length === 1 ? "" : "s"} identified`);
    logger.info({ count: findings.length }, "Gemini findings parsed");
    return findings;
  } catch (err) {
    onLog("ERROR", "Failed to parse Gemini JSON response");
    logger.error({ err, raw: raw.slice(0, 500) }, "Failed to parse Gemini response");
    return [];
  }
}

async function generatePocWithGroq(
  finding: RawFinding,
  onLog: OnLog
): Promise<string | null> {
  const key = resolveKey("GROQ_API_KEY");
  if (!key) {
    onLog("WARN", `Groq skipped for "${finding.title}" — GROQ_API_KEY not set`);
    return null;
  }

  const groq = new Groq({ apiKey: key });

  const prompt = `Vulnerability: ${finding.title}
Severity: ${finding.severity}
Description: ${finding.description}
${finding.affectedCode ? `\nAffected Code:\n${finding.affectedCode}` : ""}

Write a complete, self-contained Foundry PoC exploit that demonstrates this vulnerability with profit assertion.`;

  onLog("DEBUG", `Groq Llama 3 — writing PoC for: ${finding.title}`);

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: POC_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || content.trim().length < 50) return null;

    onLog("INFO", `Groq PoC generated for: ${finding.title}`);
    const fenced = content.match(/```(?:solidity|sol)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : content.trim();
  } catch (err) {
    onLog("WARN", `Groq failed for "${finding.title}" — escalating to SambaNova 405B`);
    logger.warn({ err, title: finding.title }, "Groq PoC generation failed");
    return null;
  }
}

async function generatePocWithSambanova(
  finding: RawFinding,
  onLog: OnLog
): Promise<string | null> {
  const key = resolveKey("SAMBANOVA_API_KEY");
  if (!key) {
    onLog("WARN", `SambaNova skipped for "${finding.title}" — SAMBANOVA_API_KEY not set`);
    return null;
  }

  const samba = new OpenAI({
    apiKey: key,
    baseURL: "https://api.sambanova.ai/v1",
  });

  const prompt = `Vulnerability: ${finding.title}
Severity: ${finding.severity}
Description: ${finding.description}
${finding.affectedCode ? `\nAffected Code:\n${finding.affectedCode}` : ""}

Write a complete, self-contained Foundry PoC exploit that demonstrates this vulnerability with profit assertion.`;

  onLog("DEBUG", `SambaNova 405B — refining PoC logic for: ${finding.title}`);

  try {
    const completion = await samba.chat.completions.create({
      model: "Meta-Llama-3.1-405B-Instruct",
      messages: [
        { role: "system", content: POC_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || content.trim().length < 50) return null;

    onLog("INFO", `SambaNova PoC complete for: ${finding.title}`);
    const fenced = content.match(/```(?:solidity|sol)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : content.trim();
  } catch (err) {
    onLog("WARN", `SambaNova failed for "${finding.title}" — falling back to Gemini 2.5 Flash`);
    logger.warn({ err, title: finding.title }, "SambaNova PoC generation failed");
    return null;
  }
}

async function generatePocWithGemini(
  finding: RawFinding,
  onLog: OnLog
): Promise<string | null> {
  const prompt = `Vulnerability: ${finding.title}
Severity: ${finding.severity}
Description: ${finding.description}
${finding.affectedCode ? `\nAffected Code:\n${finding.affectedCode}` : ""}

Write a complete, self-contained Foundry PoC exploit that demonstrates this vulnerability with profit assertion. Return ONLY the Solidity code — no markdown fences, no explanation text.`;

  onLog("DEBUG", `Gemini 2.5 Flash — generating fallback PoC for: ${finding.title}`);

  try {
    const gemini = getGeminiClient();
    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: POC_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content || content.trim().length < 50) return null;

    onLog("INFO", `Gemini PoC generated for: ${finding.title}`);
    const fenced = content.match(/```(?:solidity|sol)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : content.trim();
  } catch (err) {
    onLog("ERROR", `Gemini fallback also failed for "${finding.title}"`);
    logger.warn({ err, title: finding.title }, "Gemini fallback PoC generation failed");
    return null;
  }
}

export async function generatePocsForFindings(
  findings: RawFinding[],
  onLog: OnLog = () => {}
): Promise<Finding[]> {
  const results: Finding[] = [];

  onLog("SYSTEM", `Starting PoC generation for ${findings.length} finding${findings.length === 1 ? "" : "s"}`);

  for (const finding of findings) {
    logger.info({ title: finding.title }, "Generating PoC — trying Groq first");

    let poc: string | null = null;
    let pocSource: Finding["pocSource"] = "unavailable";

    poc = await generatePocWithGroq(finding, onLog);
    if (poc) {
      pocSource = "groq";
    } else {
      onLog("INFO", `Escalating to SambaNova 405B for: ${finding.title}`);
      poc = await generatePocWithSambanova(finding, onLog);
      if (poc) {
        pocSource = "sambanova";
      } else {
        onLog("INFO", `Escalating to Gemini 2.5 Flash (fallback) for: ${finding.title}`);
        poc = await generatePocWithGemini(finding, onLog);
        if (poc) {
          pocSource = "gemini";
        }
      }
    }

    results.push({
      id: randomUUID(),
      ...finding,
      poc: poc ?? "// PoC generation unavailable — all AI providers failed or keys not set",
      pocSource,
    });
  }

  onLog("SYSTEM", "All PoCs generated — pipeline complete");
  return results;
}

export function checkAiKeysConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!resolveKey("GEMINI_API_KEY")) missing.push("GEMINI_API_KEY (or VITE_GEMINI_API_KEY)");
  return { ok: missing.length === 0, missing };
}
