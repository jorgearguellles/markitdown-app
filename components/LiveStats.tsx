"use client";
// components/LiveStats.tsx

import { useEffect, useState } from "react";
import { FileText, Zap, BarChart2, Clock } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConversionRecord {
  fileType: string;
  fileSizeBytes: number;
  charCount: number;
  elapsedMs: number;
  success: boolean;
  ts: number; // timestamp
}

interface AggregatedStats {
  totalConversions: number;
  successRate: number;
  totalCharsGenerated: number;
  avgElapsedMs: number;
  topFormats: { type: string; count: number }[];
}

const STORAGE_KEY = "markitdown_stats";

// ─── Storage helpers (safe — SSR won't crash) ────────────────────────────────

export function readStats(): ConversionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConversionRecord[]) : [];
  } catch {
    return [];
  }
}

export function appendStat(record: ConversionRecord): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readStats();
    // Keep last 500 records max to avoid unbounded growth
    const trimmed = [...existing, record].slice(-500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    // Dispatch custom event so LiveStats re-renders in same tab
    window.dispatchEvent(new Event("markitdown_stats_updated"));
  } catch {
    // localStorage might be disabled — silent fail
  }
}

function aggregate(records: ConversionRecord[]): AggregatedStats {
  const total = records.length;
  const successful = records.filter((r) => r.success);

  const typeCounts: Record<string, number> = {};
  for (const r of records) {
    if (r.success) typeCounts[r.fileType] = (typeCounts[r.fileType] ?? 0) + 1;
  }

  const topFormats = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const avgElapsedMs =
    successful.length > 0
      ? successful.reduce((s, r) => s + r.elapsedMs, 0) / successful.length
      : 0;

  return {
    totalConversions: total,
    successRate: total > 0 ? Math.round((successful.length / total) * 100) : 0,
    totalCharsGenerated: successful.reduce((s, r) => s + r.charCount, 0),
    avgElapsedMs,
    topFormats,
  };
}

function formatChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveStats() {
  const [stats, setStats] = useState<AggregatedStats | null>(null);

  const refresh = () => {
    const records = readStats();
    if (records.length === 0) {
      setStats(null);
      return;
    }
    setStats(aggregate(records));
  };

  useEffect(() => {
    refresh();
    window.addEventListener("markitdown_stats_updated", refresh);
    return () => window.removeEventListener("markitdown_stats_updated", refresh);
  }, []);

  // Don't render until there's at least 1 conversion
  if (!stats || stats.totalConversions === 0) return null;

  return (
    <div className="w-full max-w-2xl mt-2 animate-fade-up">
      {/* divider */}
      <div className="flex items-center gap-3 mb-4">
        <span className="h-px flex-1 bg-[#1a1a1a]" />
        <span className="font-mono text-[10px] text-[#333] tracking-widest uppercase">
          your session
        </span>
        <span className="h-px flex-1 bg-[#1a1a1a]" />
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <StatCard
          icon={<FileText size={11} />}
          label="converted"
          value={String(stats.totalConversions)}
        />
        <StatCard
          icon={<Zap size={11} />}
          label="success rate"
          value={`${stats.successRate}%`}
          highlight={stats.successRate === 100}
        />
        <StatCard
          icon={<BarChart2 size={11} />}
          label="chars out"
          value={formatChars(stats.totalCharsGenerated)}
        />
        <StatCard
          icon={<Clock size={11} />}
          label="avg time"
          value={`${(stats.avgElapsedMs / 1000).toFixed(1)}s`}
        />
      </div>

      {/* top formats bar */}
      {stats.topFormats.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-[#333] uppercase tracking-wider">
            formats
          </span>
          {stats.topFormats.map(({ type, count }) => (
            <span
              key={type}
              className="font-mono text-[10px] px-2 py-0.5 border border-[#222] text-[#555]"
            >
              .{type}
              <span className="text-acid ml-1">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-[#141414] bg-[#080808] px-3 py-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[#444]">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-widest">{label}</span>
      </div>
      <span
        className={`font-mono text-lg font-medium leading-none ${
          highlight ? "text-acid" : "text-paper"
        }`}
      >
        {value}
      </span>
    </div>
  );
}