import { cn } from "@/lib/utils";

export function IrisMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-foreground", className)}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <circle cx="16" cy="16" r="3.2" fill="currentColor" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x1 = 16 + Math.cos(a) * 5.2;
        const y1 = 16 + Math.sin(a) * 5.2;
        const x2 = 16 + Math.cos(a) * 13.4;
        const y2 = 16 + Math.sin(a) * 13.4;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.85"
          />
        );
      })}
    </svg>
  );
}
