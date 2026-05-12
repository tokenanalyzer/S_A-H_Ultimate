import { logger } from "./logger";

export interface Contest {
  id: string;
  platform: "sherlock" | "code4rena";
  title: string;
  status: "active" | "upcoming" | "ended";
  repoUrl: string;
  prizePool: number | null;
  startDate: string;
  endDate: string;
  nsloc: number | null;
  tags: string[];
}

/* Resolve GitHub token — check VITE_ prefix first */
const GITHUB_TOKEN =
  process.env.VITE_GITHUB_TOKEN ||
  process.env.GITHUB_TOKEN ||
  undefined;

const githubHeaders: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "web3-audit-dashboard",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function fetchSherlockContests(status: string): Promise<Contest[]> {
  try {
    const url =
      "https://api.github.com/orgs/sherlock-audit/repos?per_page=50&sort=updated&type=public";
    const res = await fetch(url, { headers: githubHeaders });

    if (!res.ok) {
      logger.warn({ status: res.status }, "GitHub API error for Sherlock");
      return [];
    }

    const repos = (await res.json()) as Array<{
      name: string;
      html_url: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      topics?: string[];
    }>;

    const now = new Date();
    const contests: Contest[] = [];

    for (const repo of repos) {
      if (repo.name === ".github" || repo.name === "sherlock-audit") continue;

      const createdAt = new Date(repo.created_at);
      const updatedAt = new Date(repo.updated_at);
      const daysSinceUpdate =
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

      let contestStatus: "active" | "upcoming" | "ended";
      if (daysSinceUpdate < 14) {
        contestStatus = "active";
      } else if (daysSinceUpdate < 30) {
        contestStatus = "upcoming";
      } else {
        contestStatus = "ended";
      }

      if (status !== "all" && contestStatus !== status) continue;

      const prizeMatch = repo.description?.match(/\$([0-9,]+)/);
      const prizePool = prizeMatch
        ? parseInt(prizeMatch[1].replace(/,/g, ""), 10)
        : null;

      contests.push({
        id: `sherlock-${repo.name}`,
        platform: "sherlock",
        title: repo.name
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        status: contestStatus,
        repoUrl: repo.html_url,
        prizePool,
        startDate: createdAt.toISOString(),
        endDate: new Date(
          createdAt.getTime() + 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
        nsloc: null,
        tags: repo.topics ?? [],
      });
    }

    return contests;
  } catch (err) {
    logger.error({ err }, "Failed to fetch Sherlock contests");
    return [];
  }
}

async function fetchCode4renaContests(status: string): Promise<Contest[]> {
  try {
    const url =
      "https://api.github.com/orgs/code-423n4/repos?per_page=50&sort=updated&type=public";
    const res = await fetch(url, { headers: githubHeaders });

    if (!res.ok) {
      logger.warn({ status: res.status }, "GitHub API error for Code4rena");
      return [];
    }

    const repos = (await res.json()) as Array<{
      name: string;
      html_url: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      topics?: string[];
    }>;

    const now = new Date();
    const contests: Contest[] = [];

    for (const repo of repos) {
      if (!/^\d{4}-\d{2}-/.test(repo.name)) continue;

      const createdAt = new Date(repo.created_at);
      const updatedAt = new Date(repo.updated_at);
      const daysSinceUpdate =
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

      let contestStatus: "active" | "upcoming" | "ended";
      if (daysSinceUpdate < 7) {
        contestStatus = "active";
      } else if (daysSinceUpdate < 21) {
        contestStatus = "upcoming";
      } else {
        contestStatus = "ended";
      }

      if (status !== "all" && contestStatus !== status) continue;

      const prizeMatch = repo.description?.match(/\$([0-9,]+)/);
      const prizePool = prizeMatch
        ? parseInt(prizeMatch[1].replace(/,/g, ""), 10)
        : null;

      const title = repo.name
        .replace(/^\d{4}-\d{2}-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      contests.push({
        id: `c4-${repo.name}`,
        platform: "code4rena",
        title,
        status: contestStatus,
        repoUrl: repo.html_url,
        prizePool,
        startDate: createdAt.toISOString(),
        endDate: new Date(
          createdAt.getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        nsloc: null,
        tags: repo.topics ?? [],
      });
    }

    return contests;
  } catch (err) {
    logger.error({ err }, "Failed to fetch Code4rena contests");
    return [];
  }
}

export async function getContests(
  platform: string,
  status: string
): Promise<Contest[]> {
  const effectiveStatus = status ?? "active";
  const effectivePlatform = platform ?? "all";

  const [sherlock, code4rena] = await Promise.all([
    effectivePlatform === "all" || effectivePlatform === "sherlock"
      ? fetchSherlockContests(effectiveStatus)
      : Promise.resolve([]),
    effectivePlatform === "all" || effectivePlatform === "code4rena"
      ? fetchCode4renaContests(effectiveStatus)
      : Promise.resolve([]),
  ]);

  return [...sherlock, ...code4rena].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}

export async function getScoutStats(): Promise<{
  totalActive: number;
  totalUpcoming: number;
  totalPrizePool: number;
  byPlatform: { sherlock: number; code4rena: number };
}> {
  const [active, upcoming] = await Promise.all([
    getContests("all", "active"),
    getContests("all", "upcoming"),
  ]);

  const all = [...active, ...upcoming];
  const totalPrizePool = all.reduce((s, c) => s + (c.prizePool ?? 0), 0);

  return {
    totalActive: active.length,
    totalUpcoming: upcoming.length,
    totalPrizePool,
    byPlatform: {
      sherlock: all.filter((c) => c.platform === "sherlock").length,
      code4rena: all.filter((c) => c.platform === "code4rena").length,
    },
  };
}
