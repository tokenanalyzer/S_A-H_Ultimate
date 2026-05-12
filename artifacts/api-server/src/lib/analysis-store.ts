import { Finding } from "./ai-brain";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { logger } from "./logger";

export type AnalysisStatus =
  | "pending"
  | "harvesting"
  | "scanning"
  | "generating_pocs"
  | "complete"
  | "failed";

export type LogLevel = "SYSTEM" | "INFO" | "DEBUG" | "WARN" | "ERROR";

export interface AnalysisLogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

export interface AnalysisJobStats {
  fileCount: number;
  contextSizeKb: number;
  findingCount: number;
}

export interface AnalysisJob {
  jobId: string;
  repoUrl: string;
  status: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
  findings: Finding[];
  logs: AnalysisLogEntry[];
  stats: AnalysisJobStats | null;
  error: string | null;
}

const DATA_DIR = join(process.cwd(), "data");
const HISTORY_FILE = join(DATA_DIR, "audit-history.json");
const JOB_LIMIT = 50;

function ensureDataDir(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

function loadFromDisk(): Map<string, AnalysisJob> {
  ensureDataDir();
  try {
    const raw = readFileSync(HISTORY_FILE, "utf-8");
    const arr = JSON.parse(raw) as AnalysisJob[];
    const map = new Map<string, AnalysisJob>();
    for (const job of arr) {
      map.set(job.jobId, job);
    }
    logger.info({ count: map.size }, "Audit history loaded from disk");
    return map;
  } catch {
    return new Map();
  }
}

function saveToDisk(store: Map<string, AnalysisJob>): void {
  try {
    const jobs = Array.from(store.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    writeFileSync(HISTORY_FILE, JSON.stringify(jobs, null, 2), "utf-8");
  } catch (err) {
    logger.warn({ err }, "Failed to persist audit history to disk");
  }
}

const store: Map<string, AnalysisJob> = loadFromDisk();

export function createJob(jobId: string, repoUrl: string): AnalysisJob {
  if (store.size >= JOB_LIMIT) {
    const entries = Array.from(store.entries()).sort(
      ([, a], [, b]) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    if (entries[0]) store.delete(entries[0][0]);
  }

  const job: AnalysisJob = {
    jobId,
    repoUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
    findings: [],
    logs: [],
    stats: null,
    error: null,
  };

  store.set(jobId, job);
  saveToDisk(store);
  return job;
}

export function updateJob(jobId: string, patch: Partial<AnalysisJob>): void {
  const job = store.get(jobId);
  if (!job) return;
  Object.assign(job, patch);
  if (patch.status === "complete" || patch.status === "failed") {
    saveToDisk(store);
  }
}

export function pushLog(
  jobId: string,
  level: LogLevel,
  message: string
): void {
  const job = store.get(jobId);
  if (!job) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  job.logs.push({ time: `${hh}:${mm}:${ss}`, level, message });
}

export function getJob(jobId: string): AnalysisJob | undefined {
  return store.get(jobId);
}

export function listJobs(): AnalysisJob[] {
  return Array.from(store.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function findCachedJob(repoUrl: string): AnalysisJob | undefined {
  return Array.from(store.values())
    .filter((j) => j.repoUrl === repoUrl && j.status === "complete")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
}
