type StatsBarProps = {
  charCount: number;
  elapsed: number;
};

function formatChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function StatsBar({ charCount, elapsed }: StatsBarProps) {
  return (
    <div className="flex items-center gap-4 font-mono text-[10px] text-[#555] tracking-wider">
      <span>{formatChars(charCount)} chars</span>
      <span className="text-[#333]">|</span>
      <span>{elapsed < 1 ? "<1s" : `${elapsed.toFixed(1)}s`}</span>
    </div>
  );
}
