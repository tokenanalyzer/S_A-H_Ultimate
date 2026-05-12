import { useState } from "react";
import {
  useListContests,
  useGetScoutStats,
  useGetGithubRateLimit,
  useGetBountyPrograms,
  useGetBountySummary,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, Clock, Trophy, Code2, GitFork, AlertTriangle,
  Scan, TrendingUp, Shield, Globe, Zap, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

/* ── Live contest platform styling ──────────────────────────────────────── */
const LIVE_PLATFORM_STYLE: Record<string, { badge: string; label: string }> = {
  sherlock:  { badge: "bg-purple-50 text-purple-700 border-purple-200",   label: "Sherlock"  },
  code4rena: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Code4rena" },
};

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ended:    "bg-gray-100 text-gray-500 border-gray-200",
};

/* ── Bounty platform badge styles ───────────────────────────────────────── */
const BOUNTY_BADGE: Record<string, string> = {
  immunefi:    "bg-red-50 text-red-700 border-red-200",
  hackenproof: "bg-blue-50 text-blue-700 border-blue-200",
  cantina:     "bg-indigo-50 text-indigo-700 border-indigo-200",
};
const BOUNTY_LABEL: Record<string, string> = {
  immunefi:    "Immunefi",
  hackenproof: "HackenProof",
  cantina:     "Cantina",
};
const BOUNTY_DOT: Record<string, string> = {
  immunefi:    "bg-red-500",
  hackenproof: "bg-blue-500",
  cantina:     "bg-indigo-500",
};

type LivePlatform   = "all" | "sherlock" | "code4rena";
type BountyPlatform = "immunefi" | "hackenproof" | "cantina";
type AnyPlatform    = LivePlatform | BountyPlatform;

const BOUNTY_PLATFORMS: BountyPlatform[] = ["immunefi", "hackenproof", "cantina"];

function formatPrize(n: number | null | undefined): string {
  if (!n) return "—";
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
}

function timeLeft(end: string): string {
  const diff = new Date(end).getTime() - Date.now();
  if (diff < 0) return "Ended";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export default function RadarPage() {
  const [platform, setPlatform] = useState<AnyPlatform>("all");
  const [status, setStatus]     = useState<"all" | "active" | "upcoming" | "ended">("active");
  const [, navigate]            = useLocation();

  const isBountyView = BOUNTY_PLATFORMS.includes(platform as BountyPlatform);
  const livePlatform = isBountyView ? "all" : (platform as LivePlatform);

  /* Live contest hooks */
  const { data: contests = [], isLoading: contestsLoading } = useListContests(
    { platform: livePlatform, status } as Parameters<typeof useListContests>[0],
    { query: { enabled: !isBountyView } }
  );
  const { data: scoutStats }  = useGetScoutStats();
  const { data: rateLimit }   = useGetGithubRateLimit();

  /* Live bounty hooks */
  const bountyPlatformParam = isBountyView
    ? (platform as BountyPlatform)
    : "all";

  const { data: bountyResult, isLoading: bountyLoading } = useGetBountyPrograms(
    { platform: bountyPlatformParam } as Parameters<typeof useGetBountyPrograms>[0],
    { query: { enabled: platform === "all" || isBountyView, staleTime: 10 * 60 * 1000 } }
  );
  const { data: bountySummary } = useGetBountySummary(
    { query: { staleTime: 10 * 60 * 1000 } }
  );

  const bountyPrograms  = bountyResult?.programs ?? [];
  const bountyIsLive    = bountyResult?.isLive ?? false;

  /* ── Stat cards ──────────────────────────────────────────────────────── */
  const statCards = isBountyView
    ? [
        { label: "Programs Found",     value: bountyPrograms.length,                                          color: "text-blue-600",   icon: Shield     },
        { label: "Total Max Bounty",   value: formatPrize(bountyPrograms.reduce((s, p) => s + (p.maxBounty ?? 0), 0)), color: "text-emerald-600", icon: Trophy     },
        { label: "Immunefi Programs",  value: bountySummary?.byPlatform.immunefi    ?? "—",                  color: "text-red-600",    icon: Zap        },
        { label: "HackenProof / Cantina", value: `${bountySummary?.byPlatform.hackenproof ?? "—"} / ${bountySummary?.byPlatform.cantina ?? "—"}`, color: "text-indigo-600", icon: Globe },
      ]
    : [
        { label: "Active Contests",  value: scoutStats?.totalActive  ?? "—",                                color: "text-green-600",  icon: TrendingUp },
        { label: "Upcoming",         value: scoutStats?.totalUpcoming ?? "—",                               color: "text-amber-600",  icon: Clock      },
        { label: "Total Prize Pool", value: formatPrize(scoutStats?.totalPrizePool ?? null),               color: "text-emerald-600",icon: Trophy     },
        { label: "Sherlock / C4",    value: `${scoutStats?.byPlatform.sherlock ?? "—"} / ${scoutStats?.byPlatform.code4rena ?? "—"}`, color: "text-purple-600", icon: Code2 },
      ];

  return (
    <div className="space-y-8">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Contest Radar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live audit contests · Bug bounty platforms · India-friendly KYC
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live bounty data badge */}
          {(platform === "all" || isBountyView) && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 border",
              bountyIsLive
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              {bountyIsLive
                ? <><Zap className="h-3 w-3" /> Live API</>
                : <><RefreshCw className="h-3 w-3" /> Curated</>}
            </div>
          )}
          {rateLimit && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white border border-border rounded-lg px-3 py-2"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <GitFork className="h-3.5 w-3.5" />
              <span>GitHub: {rateLimit.remaining}/{rateLimit.limit}</span>
              {rateLimit.authenticated && <span className="text-green-600 font-medium">auth'd</span>}
              {rateLimit.remaining < 10 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-border p-4"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className={cn("text-xl font-bold", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Platform filter bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Live contest platforms */}
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {(["all", "sherlock", "code4rena"] as const).map((p) => (
            <Button key={p} size="sm" variant={platform === p ? "default" : "ghost"}
              className={cn("text-xs h-7 rounded-md", platform !== p && "text-muted-foreground")}
              onClick={() => setPlatform(p)}>
              {p === "all" ? "All" : p === "sherlock" ? "Sherlock" : "Code4rena"}
            </Button>
          ))}
        </div>

        {/* Bounty platforms */}
        <div className="flex gap-1 bg-white border border-border rounded-lg p-1"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {(["immunefi", "hackenproof", "cantina"] as const).map((p) => (
            <Button key={p} size="sm"
              variant={platform === p ? "default" : "ghost"}
              className={cn("text-xs h-7 rounded-md", platform !== p && "text-muted-foreground")}
              onClick={() => setPlatform(p)}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full mr-1.5 shrink-0 inline-block",
                platform === p ? "bg-white" : BOUNTY_DOT[p]
              )} />
              {BOUNTY_LABEL[p]}
            </Button>
          ))}
        </div>

        {/* Status filter — only for live contest views */}
        {!isBountyView && (
          <div className="flex gap-1 bg-white border border-border rounded-lg p-1"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            {(["active", "upcoming", "ended", "all"] as const).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "default" : "ghost"}
                className={cn("text-xs h-7 rounded-md capitalize", status !== s && "text-muted-foreground")}
                onClick={() => setStatus(s)}>
                {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BOUNTY PLATFORM CARDS (live-scraped)
      ══════════════════════════════════════════════════════════════════ */}
      {isBountyView && (
        <div className="space-y-3">
          {/* Data source banner */}
          <div className={cn(
            "flex items-center gap-2 text-xs px-3 py-2 rounded-lg border",
            bountyIsLive
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            {bountyIsLive ? <Zap className="h-3.5 w-3.5 shrink-0" /> : <RefreshCw className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {bountyIsLive
                ? `${bountyPrograms.length} programs fetched live from ${BOUNTY_LABEL[platform as BountyPlatform]} API · 10-min cache`
                : `Showing curated ${BOUNTY_LABEL[platform as BountyPlatform]} programs · live API temporarily unavailable`}
            </span>
          </div>

          {bountyLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse space-y-3"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : bountyPrograms.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-xl border border-border"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No programs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bountyPrograms.map((prog) => (
                <div key={prog.id}
                  className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3 hover:border-primary/40 transition-all duration-150 group"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", BOUNTY_BADGE[prog.platform])}>
                        {BOUNTY_LABEL[prog.platform]}
                      </span>
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        {prog.kycNote}
                      </span>
                    </div>
                    <a href={prog.url} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p className="text-sm font-semibold text-foreground">{prog.name}</p>
                  {prog.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {prog.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1">
                      {[...prog.assets.slice(0, 2), ...prog.tags.slice(0, 2)].map((t) => (
                        <span key={t} className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0 ml-auto">{prog.maxBountyDisplay}</span>
                  </div>

                  <a href={prog.url} target="_blank" rel="noopener noreferrer"
                    className="w-full text-xs h-8 mt-auto flex items-center justify-center gap-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-white group-hover:border-primary group-hover:text-primary">
                    <Globe className="h-3 w-3" /> View Program
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LIVE CONTEST GRID
      ══════════════════════════════════════════════════════════════════ */}
      {!isBountyView && (
        <>
          {contestsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse space-y-3"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : contests.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-xl border border-border"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No contests match the selected filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contests.map((contest) => {
                const ps = LIVE_PLATFORM_STYLE[contest.platform] ?? LIVE_PLATFORM_STYLE.sherlock;
                return (
                  <div key={contest.id}
                    className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3 hover:border-primary/40 transition-all duration-150 group"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-snug flex-1 min-w-0 truncate">
                        {contest.title}
                      </p>
                      <a href={contest.repoUrl} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", ps.badge)}>
                        {ps.label}
                      </span>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border capitalize", STATUS_STYLE[contest.status])}>
                        {contest.status}
                      </span>
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        India KYC ✓
                      </span>
                      {contest.prizePool != null && (
                        <span className="ml-auto text-sm font-bold text-emerald-600">
                          {formatPrize(contest.prizePool)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{timeLeft(contest.endDate)}
                      </span>
                      {contest.nsloc != null && (
                        <span className="flex items-center gap-1">
                          <Code2 className="h-3 w-3" />{contest.nsloc.toLocaleString()} nSLOC
                        </span>
                      )}
                    </div>

                    {contest.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {contest.tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <Button size="sm" variant="outline"
                      className="w-full text-xs h-8 mt-auto group-hover:border-primary group-hover:text-primary transition-colors"
                      onClick={() => navigate(`/scanner?repo=${encodeURIComponent(contest.repoUrl)}`)}>
                      <Scan className="h-3 w-3 mr-1.5" /> Scan This Repo
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          "ALL" VIEW — show bounty programs below live contests
      ══════════════════════════════════════════════════════════════════ */}
      {platform === "all" && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 px-3">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                Live Bug Bounty Programs
              </span>
              {bountyIsLive && <Zap className="h-3.5 w-3.5 text-green-500" />}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {bountyIsLive
              ? `${bountyPrograms.length} active programs fetched live · India-friendly KYC via Aadhaar, PAN, or Passport · sorted by max bounty`
              : "Curated programs from Immunefi, HackenProof, and Cantina · India-friendly KYC via Aadhaar, PAN, or Passport"}
          </p>

          {bountyLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse space-y-3"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bountyPrograms.map((prog) => (
                <div key={prog.id}
                  className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3 hover:border-primary/40 transition-all duration-150 group cursor-pointer"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                  onClick={() => setPlatform(prog.platform as BountyPlatform)}>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", BOUNTY_BADGE[prog.platform])}>
                        {BOUNTY_LABEL[prog.platform]}
                      </span>
                      <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                        {prog.kycNote}
                      </span>
                    </div>
                    <a href={prog.url} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                      onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p className="text-sm font-semibold text-foreground">{prog.name}</p>
                  {prog.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {prog.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1">
                      {[...prog.assets.slice(0, 2), ...prog.tags.slice(0, 2)].map((t) => (
                        <span key={t} className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0 ml-auto">{prog.maxBountyDisplay}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
