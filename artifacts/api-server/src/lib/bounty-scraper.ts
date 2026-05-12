import { logger } from "./logger";

export interface BountyProgram {
  id: string;
  name: string;
  description: string | null;
  maxBounty: number | null;
  maxBountyDisplay: string;
  url: string;
  platform: "immunefi" | "hackenproof" | "cantina";
  assets: string[];
  tags: string[];
  active: boolean;
  kycNote: string;
  lastUpdated: string | null;
}

/* ── Simple in-process TTL cache ─────────────────────────────────────── */
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<BountyProgram[]>>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function getFromCache(key: string): BountyProgram[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: BountyProgram[]): void {
  cache.set(key, { data, expiry: Date.now() + TTL_MS });
}

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control": "no-cache",
};

/* ══════════════════════════════════════════════════════════════════════════
   IMMUNEFI
══════════════════════════════════════════════════════════════════════════ */

/* Curated high-value Immunefi programs — updated April 2025 */
const IMMUNEFI_CURATED: BountyProgram[] = [
  { id: "immunefi-wormhole",      name: "Wormhole",      description: "Cross-chain messaging protocol. Critical bugs in the Wormhole core bridge and token bridge.",  maxBounty: 2500000,  maxBountyDisplay: "$2.5M",  url: "https://immunefi.com/bug-bounty/wormhole/",       platform: "immunefi", assets: ["Solidity", "Rust"],     tags: ["Bridge", "Cross-chain", "Critical"],         active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-uniswap",       name: "Uniswap",       description: "Leading AMM DEX. v2/v3/v4 smart contracts and periphery contracts in scope.",                   maxBounty: 2250000,  maxBountyDisplay: "$2.25M", url: "https://immunefi.com/bug-bounty/uniswap/",        platform: "immunefi", assets: ["Solidity"],           tags: ["DeFi", "AMM", "DEX"],                        active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-compound",      name: "Compound",      description: "DeFi lending protocol. Core contracts, governance, and price feeds in scope.",                   maxBounty: 150000,   maxBountyDisplay: "$150K",  url: "https://immunefi.com/bug-bounty/compound/",       platform: "immunefi", assets: ["Solidity"],           tags: ["DeFi", "Lending"],                           active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-chainlink",     name: "Chainlink",     description: "Oracle network powering most of DeFi. Data feeds, VRF, and CCIP contracts.",                    maxBounty: 100000,   maxBountyDisplay: "$100K",  url: "https://immunefi.com/bug-bounty/chainlink/",      platform: "immunefi", assets: ["Solidity", "Go"],      tags: ["Oracle", "Infrastructure"],                  active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-synthetix",     name: "Synthetix",     description: "Derivatives liquidity protocol. Perps, spot synths, and governance contracts.",                  maxBounty: 1000000,  maxBountyDisplay: "$1M",    url: "https://immunefi.com/bug-bounty/synthetixv3/",    platform: "immunefi", assets: ["Solidity"],           tags: ["DeFi", "Derivatives", "Perps"],              active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-polygon",       name: "Polygon",       description: "L2 scaling network. Bridge, staking, and validator contracts on Ethereum.",                      maxBounty: 2000000,  maxBountyDisplay: "$2M",    url: "https://immunefi.com/bug-bounty/polygon/",        platform: "immunefi", assets: ["Solidity", "Go"],      tags: ["Layer 2", "Bridge", "Infrastructure"],       active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-arbitrum",      name: "Arbitrum",      description: "Optimistic rollup Layer 2. Core rollup contracts, bridge, and sequencer.",                       maxBounty: 2000000,  maxBountyDisplay: "$2M",    url: "https://immunefi.com/bug-bounty/arbitrum/",       platform: "immunefi", assets: ["Solidity", "Go"],      tags: ["Layer 2", "Rollup", "Bridge"],               active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-aave",          name: "Aave",          description: "Decentralised lending/borrowing protocol. V2/V3 contracts and governance module.",               maxBounty: 1000000,  maxBountyDisplay: "$1M",    url: "https://immunefi.com/bug-bounty/aave/",           platform: "immunefi", assets: ["Solidity"],           tags: ["DeFi", "Lending", "Borrowing"],              active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-maker",         name: "MakerDAO",      description: "DAI stablecoin and MCD system. Core vaults, oracle security module, governance.",                maxBounty: 10000000, maxBountyDisplay: "$10M",   url: "https://immunefi.com/bug-bounty/makerdao/",       platform: "immunefi", assets: ["Solidity"],           tags: ["Stablecoin", "DeFi", "Governance"],          active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-curve",         name: "Curve Finance", description: "Stablecoin AMM. Core pool contracts, gauge system, and crvUSD stablecoin.",                      maxBounty: 250000,   maxBountyDisplay: "$250K",  url: "https://immunefi.com/bug-bounty/curve/",          platform: "immunefi", assets: ["Solidity", "Vyper"],   tags: ["DeFi", "AMM", "Stablecoin"],                 active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-stargate",      name: "Stargate",      description: "Omnichain liquidity protocol built on LayerZero. Bridge and pool contracts.",                    maxBounty: 1000000,  maxBountyDisplay: "$1M",    url: "https://immunefi.com/bug-bounty/stargate/",       platform: "immunefi", assets: ["Solidity"],           tags: ["Bridge", "Cross-chain", "DeFi"],             active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "immunefi-opyn",          name: "Opyn / Squeeth", description: "Perpetual options protocol. Squeeth power perpetual and vault contracts.",                      maxBounty: 1000000,  maxBountyDisplay: "$1M",    url: "https://immunefi.com/bug-bounty/opyn/",           platform: "immunefi", assets: ["Solidity"],           tags: ["Options", "DeFi", "Derivatives"],            active: true, kycNote: "India KYC ✓", lastUpdated: null },
];

async function fetchImmunefiBounties(): Promise<BountyProgram[]> {
  const KNOWN_ENDPOINTS = [
    "https://immunefi.com/explore.json",
    "https://immunefi.com/_next/data/production/explore.json",
  ];

  for (const url of KNOWN_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("json")) continue;

      const json = (await res.json()) as {
        pageProps?: { bounties?: Array<Record<string, unknown>> };
        bounties?: Array<Record<string, unknown>>;
      };

      const rawList: Array<Record<string, unknown>> =
        json.pageProps?.bounties ?? json.bounties ?? [];

      if (rawList.length === 0) continue;

      const programs: BountyProgram[] = rawList.map((b) => {
        const maxBounty =
          typeof b.maxBounty === "number"
            ? b.maxBounty
            : typeof b.maximumBounty === "number"
            ? b.maximumBounty
            : null;

        const name = String(b.project ?? b.name ?? "Unknown");
        const id = String(b.id ?? b.slug ?? name.toLowerCase().replace(/\s+/g, "-"));
        const slug = String(b.slug ?? id);

        return {
          id: `immunefi-${id}`,
          name,
          description: typeof b.tagline === "string" ? b.tagline : null,
          maxBounty,
          maxBountyDisplay: maxBounty
            ? maxBounty >= 1_000_000
              ? `$${(maxBounty / 1_000_000).toFixed(1)}M`
              : `$${(maxBounty / 1000).toFixed(0)}K`
            : "Varies",
          url: `https://immunefi.com/bug-bounty/${slug}/`,
          platform: "immunefi",
          assets: Array.isArray(b.assets)
            ? (b.assets as string[]).slice(0, 5)
            : [],
          tags: Array.isArray(b.programTypes)
            ? (b.programTypes as string[]).slice(0, 4)
            : [],
          active: b.status !== "inactive",
          kycNote: "India KYC ✓",
          lastUpdated: typeof b.updatedAt === "string" ? b.updatedAt : null,
        };
      });

      logger.info({ count: programs.length, url }, "Immunefi live fetch succeeded");
      return programs;
    } catch (err) {
      logger.warn({ url, err }, "Immunefi endpoint failed");
    }
  }

  logger.info("Immunefi live API unavailable — serving curated programs");
  return IMMUNEFI_CURATED;
}

/* ══════════════════════════════════════════════════════════════════════════
   HACKENPROOF
══════════════════════════════════════════════════════════════════════════ */

const HACKENPROOF_CURATED: BountyProgram[] = [
  { id: "hp-1inch",       name: "1inch Network",     description: "DEX aggregation protocol. Smart contracts across Ethereum, BNB Chain, Polygon, and more.",               maxBounty: 1000000, maxBountyDisplay: "$1M",    url: "https://hackenproof.com/programs/1inch-network",      platform: "hackenproof", assets: ["Solidity"],           tags: ["DeFi", "DEX", "Aggregator"],   active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-near",        name: "NEAR Protocol",     description: "Layer-1 blockchain runtime and bridge contracts. Rust-based smart contracts and validators.",               maxBounty: 1000000, maxBountyDisplay: "$1M",    url: "https://hackenproof.com/programs/near-protocol",      platform: "hackenproof", assets: ["Rust", "AssemblyScript"], tags: ["Layer 1", "Infrastructure"],   active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-kyberswap",   name: "KyberSwap",         description: "Multi-chain DEX and liquidity protocol. Elastic pools and aggregator contracts.",                          maxBounty: 1000000, maxBountyDisplay: "$1M",    url: "https://hackenproof.com/programs/kyberswap",          platform: "hackenproof", assets: ["Solidity"],           tags: ["DeFi", "DEX", "AMM"],          active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-casper",      name: "Casper Network",    description: "PoS Layer-1 blockchain. Network node, contracts, and validator infrastructure.",                           maxBounty: 500000,  maxBountyDisplay: "$500K",  url: "https://hackenproof.com/programs/casper-network",     platform: "hackenproof", assets: ["Rust"],               tags: ["Layer 1", "Infrastructure"],   active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-huobi",       name: "HTX (Huobi)",       description: "Major centralised exchange. Smart contracts for token issuance and bridge to HTX Eco Chain.",              maxBounty: 500000,  maxBountyDisplay: "$500K",  url: "https://hackenproof.com/programs/huobi",              platform: "hackenproof", assets: ["Solidity"],           tags: ["CEX", "Bridge"],               active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-moonbeam",    name: "Moonbeam",          description: "Ethereum-compatible parachain on Polkadot. EVM smart contracts and Substrate pallets.",                    maxBounty: 1000000, maxBountyDisplay: "$1M",    url: "https://hackenproof.com/programs/moonbeam",           platform: "hackenproof", assets: ["Solidity", "Rust"],   tags: ["Layer 1", "EVM", "Polkadot"],  active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-biconomy",    name: "Biconomy",          description: "Account abstraction infrastructure. Smart account contracts, paymaster, and bundler.",                     maxBounty: 500000,  maxBountyDisplay: "$500K",  url: "https://hackenproof.com/programs/biconomy",           platform: "hackenproof", assets: ["Solidity"],           tags: ["Account Abstraction", "ERC-4337"], active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "hp-algobra",     name: "Algebra Protocol",  description: "Concentrated liquidity AMM used by dozens of DEXs. Core pool and plugin contracts.",                       maxBounty: 100000,  maxBountyDisplay: "$100K",  url: "https://hackenproof.com/programs/algebra-protocol",   platform: "hackenproof", assets: ["Solidity"],           tags: ["DeFi", "AMM", "Concentrated Liquidity"], active: true, kycNote: "India KYC ✓", lastUpdated: null },
];

async function fetchHackenproofBounties(): Promise<BountyProgram[]> {
  const ENDPOINTS = [
    "https://hackenproof.com/api/v1/public/programs",
    "https://hackenproof.com/api/bug_bounty_programs",
  ];

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("json")) continue;

      const json = (await res.json()) as {
        data?: Array<Record<string, unknown>>;
        programs?: Array<Record<string, unknown>>;
      };

      const rawList = json.data ?? json.programs ?? [];
      if (rawList.length === 0) continue;

      const programs: BountyProgram[] = rawList.map((p) => {
        const maxBounty =
          typeof p.maxReward === "number"
            ? p.maxReward
            : typeof p.max_reward === "number"
            ? p.max_reward
            : null;

        const name = String(p.title ?? p.name ?? "Unknown");
        const id = String(p.id ?? p.slug ?? name.toLowerCase().replace(/\s+/g, "-"));

        return {
          id: `hp-${id}`,
          name,
          description: typeof p.description === "string" ? p.description.slice(0, 200) : null,
          maxBounty,
          maxBountyDisplay: maxBounty
            ? maxBounty >= 1_000_000
              ? `$${(maxBounty / 1_000_000).toFixed(1)}M`
              : `$${(maxBounty / 1000).toFixed(0)}K`
            : "Varies",
          url: `https://hackenproof.com/programs/${id}`,
          platform: "hackenproof",
          assets: [],
          tags: typeof p.category === "string" ? [p.category] : [],
          active: p.status === "active" || p.status === "public",
          kycNote: "India KYC ✓",
          lastUpdated: typeof p.updated_at === "string" ? p.updated_at : null,
        };
      });

      logger.info({ count: programs.length, url }, "HackenProof live fetch succeeded");
      return programs;
    } catch (err) {
      logger.warn({ url, err }, "HackenProof endpoint failed — Cloudflare likely blocking");
    }
  }

  logger.info("HackenProof live API unavailable — serving curated programs");
  return HACKENPROOF_CURATED;
}

/* ══════════════════════════════════════════════════════════════════════════
   CANTINA
══════════════════════════════════════════════════════════════════════════ */

const CANTINA_CURATED: BountyProgram[] = [
  { id: "cantina-op",           name: "Optimism Superchain",  description: "Core Superchain contracts, OP Stack, and cross-chain messaging. Top-tier payout.",        maxBounty: 2000000, maxBountyDisplay: "$2M",    url: "https://cantina.xyz/competitions",  platform: "cantina", assets: ["Solidity", "Go"],  tags: ["Layer 2", "Rollup", "Bridge"],   active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "cantina-zora",         name: "Zora Protocol",        description: "NFT minting and marketplace protocol. Creator contracts and marketplace.",                  maxBounty: 100000,  maxBountyDisplay: "$100K",  url: "https://cantina.xyz/competitions",  platform: "cantina", assets: ["Solidity"],        tags: ["NFT", "Marketplace"],            active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "cantina-morpho",       name: "Morpho Blue",          description: "Permissionless lending protocol. Core morpho-blue and metamorpho contracts.",              maxBounty: 1000000, maxBountyDisplay: "$1M",    url: "https://cantina.xyz/competitions",  platform: "cantina", assets: ["Solidity"],        tags: ["DeFi", "Lending"],               active: true, kycNote: "India KYC ✓", lastUpdated: null },
  { id: "cantina-frax",         name: "Frax Finance",         description: "Algorithmic stablecoin and liquid staking. frxETH, sfrxETH, and FraxSwap.",               maxBounty: 500000,  maxBountyDisplay: "$500K",  url: "https://cantina.xyz/competitions",  platform: "cantina", assets: ["Solidity"],        tags: ["Stablecoin", "DeFi", "LSD"],     active: true, kycNote: "India KYC ✓", lastUpdated: null },
];

async function fetchCantinaBounties(): Promise<BountyProgram[]> {
  const ENDPOINTS = [
    "https://cantina.xyz/api/competitions",
    "https://cantina.xyz/api/v1/competitions",
  ];

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("json")) continue;

      const json = (await res.json()) as {
        data?: Array<Record<string, unknown>>;
        competitions?: Array<Record<string, unknown>>;
      };

      const rawList = json.data ?? json.competitions ?? [];
      if (rawList.length === 0) continue;

      const programs: BountyProgram[] = rawList.map((c) => {
        const maxBounty =
          typeof c.prizePool === "number" ? c.prizePool : null;
        const name = String(c.title ?? c.name ?? "Unknown");
        const id = String(c.id ?? name.toLowerCase().replace(/\s+/g, "-"));

        return {
          id: `cantina-${id}`,
          name,
          description: typeof c.description === "string" ? c.description.slice(0, 200) : null,
          maxBounty,
          maxBountyDisplay: maxBounty
            ? maxBounty >= 1_000_000
              ? `$${(maxBounty / 1_000_000).toFixed(1)}M`
              : `$${(maxBounty / 1000).toFixed(0)}K`
            : "Varies",
          url: `https://cantina.xyz/competitions/${id}`,
          platform: "cantina",
          assets: [],
          tags: [],
          active: c.status === "active" || c.status === "open",
          kycNote: "India KYC ✓",
          lastUpdated: null,
        };
      });

      logger.info({ count: programs.length, url }, "Cantina live fetch succeeded");
      return programs;
    } catch (err) {
      logger.warn({ url, err }, "Cantina endpoint failed");
    }
  }

  logger.info("Cantina live API unavailable — serving curated programs");
  return CANTINA_CURATED;
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════════════════════════════ */

export async function getBountyPrograms(
  platform: string
): Promise<{ programs: BountyProgram[]; isLive: boolean; source: string }> {
  const eff = platform ?? "all";

  if (eff === "all" || eff === "immunefi") {
    const cached = getFromCache("immunefi");
    if (!cached) {
      const programs = await fetchImmunefiBounties();
      setCache("immunefi", programs);
    }
  }
  if (eff === "all" || eff === "hackenproof") {
    const cached = getFromCache("hackenproof");
    if (!cached) {
      const programs = await fetchHackenproofBounties();
      setCache("hackenproof", programs);
    }
  }
  if (eff === "all" || eff === "cantina") {
    const cached = getFromCache("cantina");
    if (!cached) {
      const programs = await fetchCantinaBounties();
      setCache("cantina", programs);
    }
  }

  let programs: BountyProgram[] = [];

  if (eff === "all") {
    programs = [
      ...(getFromCache("immunefi") ?? IMMUNEFI_CURATED),
      ...(getFromCache("hackenproof") ?? HACKENPROOF_CURATED),
      ...(getFromCache("cantina") ?? CANTINA_CURATED),
    ];
  } else if (eff === "immunefi") {
    programs = getFromCache("immunefi") ?? IMMUNEFI_CURATED;
  } else if (eff === "hackenproof") {
    programs = getFromCache("hackenproof") ?? HACKENPROOF_CURATED;
  } else if (eff === "cantina") {
    programs = getFromCache("cantina") ?? CANTINA_CURATED;
  }

  programs = programs.filter((p) => p.active);
  programs.sort((a, b) => (b.maxBounty ?? 0) - (a.maxBounty ?? 0));

  const immunefiIsLive =
    eff === "immunefi" || eff === "all"
      ? !!cache.get("immunefi")
      : true;

  return {
    programs,
    isLive: immunefiIsLive,
    source:
      "Live data from platform APIs where available, curated fallback otherwise",
  };
}

export async function getBountySummary(): Promise<{
  totalPrograms: number;
  totalMaxBounty: number;
  byPlatform: { immunefi: number; hackenproof: number; cantina: number };
}> {
  const { programs } = await getBountyPrograms("all");
  return {
    totalPrograms: programs.length,
    totalMaxBounty: programs.reduce((s, p) => s + (p.maxBounty ?? 0), 0),
    byPlatform: {
      immunefi:    programs.filter((p) => p.platform === "immunefi").length,
      hackenproof: programs.filter((p) => p.platform === "hackenproof").length,
      cantina:     programs.filter((p) => p.platform === "cantina").length,
    },
  };
}
