export const Histogram = () => (
  <div className="h-24 bg-zinc-900 rounded border border-zinc-800 relative overflow-hidden flex items-end px-1 gap-[1px]">
    {Array.from({ length: 40 }).map((_, i) => {
      const height = (Math.sin(i * 0.3) + 1) * 40 + 10;
      return (
        <div
          key={i}
          className="flex-1 bg-zinc-700 opacity-50 hover:opacity-80 transition-opacity"
          style={{ height: `${height}%` }}
        ></div>
      );
    })}
    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/20 to-transparent pointer-events-none"></div>
    <div className="absolute top-1 left-1 text-[9px] text-zinc-500 font-mono">
      ISO 200 | 35mm | f/2.8
    </div>
  </div>
);
