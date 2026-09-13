import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { IrisMark } from "@/components/iris-mark";
import { isDesktopGui } from "@/lib/aperture/desktop";
import { useAperture } from "@/lib/aperture/store";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Overview" },
  { to: "/play", label: "Gym" },
  { to: "/eval", label: "Eval" },
  { to: "/library", label: "Library" },
  { to: "/data", label: "Data" },
  { to: "/desktop", label: "Desktop" },
  { to: "/contract", label: "Contract" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const gui = isDesktopGui();
  useEffect(() => {
    void useAperture.persist.rehydrate();
  }, []);
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to={gui ? "/play" : "/"} className="flex min-w-0 items-center gap-2.5">
            <IrisMark className="size-7 shrink-0" />
            <span className="font-display text-lg tracking-tight">Aperture</span>
            {gui ? (
              <span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
                local
              </span>
            ) : null}
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "min-h-11 rounded-md px-3 py-2 text-muted-foreground transition-colors duration-150",
                    active && "bg-secondary text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
