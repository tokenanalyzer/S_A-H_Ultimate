import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import {
  StartAnalysisBody,
  GetAnalysisJobParams,
  ListAnalysisJobsResponse,
  GetAnalysisJobResponse,
} from "@workspace/api-zod";
import {
  checkAiKeysConfigured,
  scanWithGemini,
  generatePocsForFindings,
  deduplicateFindings,
  type OnLog,
} from "../lib/ai-brain";
import { harvestRepo } from "../lib/harvester";
import {
  createJob,
  updateJob,
  pushLog,
  getJob,
  listJobs,
  findCachedJob,
} from "../lib/analysis-store";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function runAnalysisPipeline(
  jobId: string,
  repoUrl: string,
  branch?: string
): Promise<void> {
  const log: OnLog = (level, message) => {
    pushLog(jobId, level, message);
    logger.info({ jobId, level }, message);
  };

  try {
    updateJob(jobId, { status: "harvesting" });
    log("SYSTEM", `Initializing pipeline for ${repoUrl}`);
    log("INFO", "Cloning repository and extracting Solidity files...");

    const harvest = await harvestRepo(repoUrl, branch);

    if (harvest.status === "failed" || !harvest.context) {
      log("ERROR", `Harvest failed: ${harvest.error ?? "no .sol files found"}`);
      updateJob(jobId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: harvest.error ?? "Harvest produced no context",
      });
      return;
    }

    log(
      "INFO",
      `Harvest complete — ${harvest.fileCount} files, ${harvest.contextSizeKb} KB`
    );

    updateJob(jobId, {
      status: "scanning",
      stats: {
        fileCount: harvest.fileCount,
        contextSizeKb: harvest.contextSizeKb,
        findingCount: 0,
      },
    });

    const rawFindings = await scanWithGemini(harvest.context, log);

    log("INFO", "Running smart deduplicator on findings...");
    const dedupedFindings = deduplicateFindings(rawFindings, log);

    if (dedupedFindings.length === 0) {
      log("INFO", "No vulnerabilities detected in this codebase");
    }

    updateJob(jobId, {
      status: "generating_pocs",
      stats: {
        fileCount: harvest.fileCount,
        contextSizeKb: harvest.contextSizeKb,
        findingCount: dedupedFindings.length,
      },
    });

    const findings = await generatePocsForFindings(dedupedFindings, log);

    updateJob(jobId, {
      status: "complete",
      completedAt: new Date().toISOString(),
      findings,
      stats: {
        fileCount: harvest.fileCount,
        contextSizeKb: harvest.contextSizeKb,
        findingCount: findings.length,
      },
    });

    log(
      "SYSTEM",
      `Scan complete — ${findings.length} finding${findings.length === 1 ? "" : "s"} reported`
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("ERROR", `Pipeline error: ${errMsg}`);
    logger.error({ jobId, err }, "Analysis pipeline failed");
    updateJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: errMsg,
    });
  }
}

router.post("/analysis/scan", async (req, res): Promise<void> => {
  const { ok, missing } = checkAiKeysConfigured();
  if (!ok) {
    res.status(503).json({
      error: `AI keys not configured: ${missing.join(", ")}`,
    });
    return;
  }

  const parsed = StartAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const forceRescan = req.body.force === true;
  const { repoUrl, branch } = parsed.data;

  if (!forceRescan && !branch) {
    const cached = findCachedJob(repoUrl);
    if (cached) {
      logger.info({ jobId: cached.jobId, repoUrl }, "Returning cached scan result");
      res.status(202).json({ jobId: cached.jobId, status: cached.status });
      return;
    }
  }

  const jobId = randomUUID();
  createJob(jobId, repoUrl);

  runAnalysisPipeline(jobId, repoUrl, branch ?? undefined).catch((err) => {
    logger.error({ jobId, err }, "Unhandled pipeline error");
  });

  res.status(202).json({ jobId, status: "pending" });
});

router.get("/analysis/jobs", (_req, res): void => {
  const jobs = listJobs();
  res.json(ListAnalysisJobsResponse.parse(jobs));
});

router.get("/analysis/jobs/:jobId", (req, res): void => {
  const params = GetAnalysisJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const job = getJob(params.data.jobId);
  if (!job) {
    res.status(404).json({ error: "Analysis job not found" });
    return;
  }

  res.json(GetAnalysisJobResponse.parse(job));
});

export default router;
