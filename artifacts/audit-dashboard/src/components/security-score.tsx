import { cn } from "@/lib/utils";

interface Finding {
  severity: string;
}

interface SecurityScoreProps {
  findings: Finding[];
  className?: string;
  compact?: boolean;
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical:       25,
  high:           15,
  medium:          8,
  low:             3,
  informational:   1,
};

export function computeScore(findings: Finding[]): number {
  const deduction = findings.reduce((acc, f) => acc + (SEVERITY_WEIGHTS[f.severity] ?? 0), 0);
  return Math.max(0, 100 - deduction);
}

function scoreLabel(score: number): { label: string; grade: string; cls: string } {
  if (score >= 90) return { label: "Excellent",  grade: "A", cls: "score-excellent" };
  if (score >= 75) return { label: "Good",        grade: "B", cls: "score-good" };
  if (score >= 55) return { label: "Fair",        grade: "C", cls: "score-fair" };
  if (score >= 35) return { label: "Poor",        grade: "D", cls: "score-poor" };
  return              { label: "Critical Risk", grade: "F", cls: "score-poor" };
}

function scoreColor(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 75) return "#2563EB";
  if (score >= 55) return "#D97706";
  return "#DC2626";
}

/** Semi-circular SVG gauge */
function Gauge({ score }: { score: number }) {
  const R = 54;
  const cx = 70;
  const cy = 70;
  const arcLen = Math.PI * R;       // half-circle circumference
  const filled = (score / 100) * arcLen;
  const color = scoreColor(score);

  return (
    <svg viewBox="0 0 140 80" className="w-full" style={{ maxWidth: 200 }}>
      {/* Track */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      {/* Score text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700"
        fill={color} fontFamily="-apple-system,BlinkMacSystemFont,'Inter',sans-serif">
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#6E6E73"
        fontFamily="-apple-system,BlinkMacSystemFont,'Inter',sans-serif">
        / 100
      </text>
    </svg>
  );
}

export default function SecurityScore({ findings, className, compact = false }: SecurityScoreProps) {
  const score = computeScore(findings);
  const { label, grade, cls } = scoreLabel(score);

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const severities = [
    { key: "critical",      label: "Critical",      color: "#C0392B", bg: "#FEF2F2" },
    { key: "high",          label: "High",          color: "#D35400", bg: "#FFF7ED" },
    { key: "medium",        label: "Medium",        color: "#9B7700", bg: "#FEFCE8" },
    { key: "low",           label: "Low",           color: "#1A6FA8", bg: "#EFF6FF" },
    { key: "informational", label: "Info",          color: "#6E6E73", bg: "#F9FAFB" },
  ].filter(s => (counts[s.key] ?? 0) > 0);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("text-lg font-bold", cls)}>{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
        <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", cls)}
          style={{ background: scoreColor(score) + "15" }}>
          {grade}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white border border-border rounded-xl p-5",
      "shadow-sm",
      className
    )} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h3 className="text-sm font-semibold text-foreground mb-4">Security Risk Score</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Gauge */}
        <div className="flex-shrink-0 w-36">
          <Gauge score={score} />
          <div className="text-center mt-1">
            <span className={cn("text-sm font-semibold", cls)}>{label}</span>
            <span className={cn(
              "ml-2 text-xs font-bold px-1.5 py-0.5 rounded",
              cls
            )} style={{ background: scoreColor(score) + "15" }}>
              {grade}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 w-full space-y-2">
          {severities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vulnerabilities — perfect score.</p>
          ) : (
            severities.map(({ key, label, color, bg }) => {
              const count = counts[key] ?? 0;
              const weight = SEVERITY_WEIGHTS[key] ?? 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-16 shrink-0" style={{ color }}>
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "#E5E7EB" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, count * weight)}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })
          )}
          <p className="text-xs text-muted-foreground pt-1">
            Score = 100 − Σ(severity × weight). Critical −25, High −15, Med −8, Low −3.
          </p>
        </div>
      </div>
    </div>
  );
}
