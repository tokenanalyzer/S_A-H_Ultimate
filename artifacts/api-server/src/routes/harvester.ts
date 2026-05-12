import { Router, type IRouter } from "express";
import {
  HarvestRepoBody,
  HarvestRepoResponse,
  ListHarvestJobsResponse,
} from "@workspace/api-zod";
import { harvestRepo, listHarvestJobs } from "../lib/harvester";

const router: IRouter = Router();

router.post("/harvester/harvest", async (req, res): Promise<void> => {
  const parsed = HarvestRepoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { repoUrl, branch } = parsed.data;
  const result = await harvestRepo(repoUrl, branch ?? undefined);

  if (result.status === "failed") {
    res.status(500).json(HarvestRepoResponse.parse(result));
    return;
  }

  res.json(HarvestRepoResponse.parse(result));
});

router.get("/harvester/jobs", (_req, res): void => {
  const jobs = listHarvestJobs();
  res.json(ListHarvestJobsResponse.parse(jobs));
});

export default router;
