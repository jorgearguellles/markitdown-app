export function PreviewBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "preview") return null;

  return (
    <div className="w-full bg-yellow-400 text-black font-mono text-xs text-center py-1 tracking-widest uppercase">
      ⚠ Preview — not production
    </div>
  );
}
