import { exec } from "child_process";
import { promisify } from "util";
import { readdir, readFile, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { logger } from "./logger";

const execAsync = promisify(exec);

export interface HarvestJob {
  jobId: string;
  repoUrl: string;
  status: "success" | "partial" | "failed" | "pending";
  createdAt: string;
  fileCount: number;
  contextSizeKb: number | null;
}

export interface HarvestResult {
  jobId: string;
  repoUrl: string;
  status: "success" | "partial" | "failed";
  fileCount: number;
  totalLines: number;
  contextSizeKb: number;
  files: string[];
  error: string | null;
  context: string | null;
}

const jobStore = new Map<string, HarvestJob>();
const JOB_LIMIT = 50;

async function findSolFiles(dir: string): Promise<string[]> {
  const solFiles: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        if (
          ["node_modules", ".git", "lib", "test", "tests", "mock"].includes(
            entry.name
          )
        ) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".sol")) {
        solFiles.push(fullPath);
      }
    }
  }

  await walk(dir);
  return solFiles;
}

function sanitizeGitUrl(url: string): string {
  if (
    !url.startsWith("https://github.com/") &&
    !url.startsWith("git@github.com:")
  ) {
    throw new Error("Only GitHub URLs are supported");
  }
  if (/[;&|`$(){}[\]<>\\]/.test(url)) {
    throw new Error("Invalid characters in URL");
  }
  return url.trim();
}

/** Inject GitHub token into the clone URL for private/restricted repos */
function buildAuthenticatedCloneUrl(url: string): string {
  const token =
    process.env.VITE_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    undefined;

  if (!token) return url;

  if (url.startsWith("https://github.com/")) {
    return url.replace("https://github.com/", `https://${token}@github.com/`);
  }
  return url;
}

export async function harvestRepo(
  repoUrl: string,
  branch?: string
): Promise<HarvestResult> {
  const jobId = randomUUID();
  const cloneDir = join(tmpdir(), `audit-harvest-${jobId}`);

  const job: HarvestJob = {
    jobId,
    repoUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
    fileCount: 0,
    contextSizeKb: null,
  };
  jobStore.set(jobId, job);

  if (jobStore.size > JOB_LIMIT) {
    const oldest = Array.from(jobStore.keys())[0];
    if (oldest) jobStore.delete(oldest);
  }

  try {
    const safeUrl = sanitizeGitUrl(repoUrl);
    const authenticatedUrl = buildAuthenticatedCloneUrl(safeUrl);
    const branchFlag = branch ? `--branch ${branch}` : "";
    const cloneCmd = `git clone --depth 1 ${branchFlag} ${authenticatedUrl} ${cloneDir} 2>&1`;

    logger.info({ jobId, repoUrl }, "Starting harvest");
    await execAsync(cloneCmd, { timeout: 120_000 });

    const solFiles = await findSolFiles(cloneDir);
    logger.info({ jobId, count: solFiles.length }, "Found .sol files");

    if (solFiles.length === 0) {
      job.status = "partial";
      job.fileCount = 0;
      job.contextSizeKb = 0;
      return {
        jobId,
        repoUrl,
        status: "partial",
        fileCount: 0,
        totalLines: 0,
        contextSizeKb: 0,
        files: [],
        error: "No .sol files found in repository",
        context: null,
      };
    }

    const sections: string[] = [];
    let totalLines = 0;
    const relativeFiles: string[] = [];

    for (const filePath of solFiles) {
      try {
        const content = await readFile(filePath, "utf-8");
        const relPath = filePath.replace(cloneDir + "/", "");
        relativeFiles.push(relPath);
        totalLines += content.split("\n").length;
        sections.push(`// ======== FILE: ${relPath} ========\n${content}\n`);
      } catch (err) {
        logger.warn({ filePath, err }, "Failed to read file");
      }
    }

    const contextContent = sections.join("\n");
    const contextSizeKb =
      Math.round((Buffer.byteLength(contextContent, "utf-8") / 1024) * 100) /
      100;

    const contextPath = join(cloneDir, "context.txt");
    await writeFile(contextPath, contextContent, "utf-8");

    logger.info(
      { jobId, fileCount: solFiles.length, contextSizeKb },
      "Harvest complete"
    );

    job.status = "success";
    job.fileCount = solFiles.length;
    job.contextSizeKb = contextSizeKb;

    return {
      jobId,
      repoUrl,
      status: "success",
      fileCount: solFiles.length,
      totalLines,
      contextSizeKb,
      files: relativeFiles,
      error: null,
      context: contextContent,
    };
  } catch (err) {
    logger.error({ jobId, err }, "Harvest failed");
    const errMsg = err instanceof Error ? err.message : String(err);

    job.status = "failed";
    return {
      jobId,
      repoUrl,
      status: "failed",
      fileCount: 0,
      totalLines: 0,
      contextSizeKb: 0,
      files: [],
      error: errMsg,
      context: null,
    };
  } finally {
    if (existsSync(cloneDir)) {
      rm(cloneDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export function listHarvestJobs(): HarvestJob[] {
  return Array.from(jobStore.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
