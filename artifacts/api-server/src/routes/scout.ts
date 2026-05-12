import { Router, type IRouter } from "express";
import {
  ListContestsQueryParams,
  ListContestsResponse,
  GetScoutStatsResponse,
  GetGithubRateLimitResponse,
} from "@workspace/api-zod";
import { getContests, getScoutStats } from "../lib/scout";

const router: IRouter = Router();

router.get("/scout/contests", async (req, res): Promise<void> => {
  const parsed = ListContestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { platform = "all", status = "active" } = parsed.data;
  const contests = await getContests(platform, status);
  res.json(ListContestsResponse.parse(contests));
});

router.get("/scout/stats", async (_req, res): Promise<void> => {
  const stats = await getScoutStats();
  res.json(GetScoutStatsResponse.parse(stats));
});

router.get("/scout/rate-limit", async (_req, res): Promise<void> => {
  const token = process.env.VITE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "web3-audit-dashboard",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const r = await fetch("https://api.github.com/rate_limit", { headers });
    const data = (await r.json()) as {
      rate?: { limit: number; remaining: number; reset: number };
    };
    const rate = data.rate ?? { limit: 60, remaining: 0, reset: Date.now() / 1000 + 3600 };
    res.json(
      GetGithubRateLimitResponse.parse({
        limit: rate.limit,
        remaining: rate.remaining,
        reset: new Date(rate.reset * 1000).toISOString(),
        authenticated: !!token,
      })
    );
  } catch {
    res.json(
      GetGithubRateLimitResponse.parse({
        limit: 60,
        remaining: 0,
        reset: new Date(Date.now() + 3600_000).toISOString(),
        authenticated: false,
      })
    );
  }
});

export default router;
