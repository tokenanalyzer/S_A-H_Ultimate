import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Shield, Scan, FileText, Radar, Info, Bookmark } from "lucide-react";
import { useSavedFindings } from "@/hooks/use-saved-findings";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/",        label: "Radar",   icon: Radar    },
  { href: "/scanner", label: "Scanner", icon: Scan     },
  { href: "/reports", label: "Reports", icon: FileText  },
  { href: "/saved",   label: "Saved",   icon: Bookmark, badge: true },
  { href: "/about",   label: "About",   icon: Info     },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { saved }  = useSavedFindings();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="border-b border-border bg-sidebar sticky top-0 z-50"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-2">

            {/* Logo — always visible, never truncated */}
            <div className="flex items-center gap-2 shrink-0">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <span className="font-semibold text-sm tracking-tight text-foreground whitespace-nowrap">
                S_A-H <span className="text-primary">ULTIMATE</span>
              </span>
            </div>

            {/* Scrollable nav + LIVE — swipeable on mobile */}
            <div
              className="flex-1 overflow-x-auto no-scrollbar"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex items-center gap-0.5 min-w-max pl-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
                  const active =
                    href === "/"
                      ? location === "/" || location === ""
                      : location.startsWith(href);
                  return (
                    <Link key={href} href={href}>
                      <button
                        className={cn(
                          "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                        {badge && saved.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
                            {saved.length > 9 ? "9+" : saved.length}
                          </span>
                        )}
                      </button>
                    </Link>
                  );
                })}

                {/* LIVE tag */}
                <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-border text-xs text-muted-foreground whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-blue shrink-0" />
                  <span className="font-medium">LIVE</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
