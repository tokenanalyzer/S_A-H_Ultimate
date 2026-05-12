import { Router, type IRouter } from "express";
import {
  GetBountyProgramsQueryParams,
  GetBountyProgramsResponse,
  GetBountySummaryResponse,
} from "@workspace/api-zod";
import { getBountyPrograms, getBountySummary } from "../lib/bounty-scraper";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/bounty/programs", async (req, res): Promise<void> => {
  const parsed = GetBountyProgramsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { platform = "all" } = parsed.data;

  try {
    const result = await getBountyPrograms(platform);
    res.json(GetBountyProgramsResponse.parse(result));
  } catch (err) {
    logger.error({ err }, "Failed to fetch bounty programs");
    res.status(500).json({ error: "Failed to fetch bounty programs" });
  }
});

router.get("/bounty/summary", async (_req, res): Promise<void> => {
  try {
    const summary = await getBountySummary();
    res.json(GetBountySummaryResponse.parse(summary));
  } catch (err) {
    logger.error({ err }, "Failed to fetch bounty summary");
    res.status(500).json({ error: "Failed to fetch bounty summary" });
  }
});

export default router;
