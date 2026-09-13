import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <span className="text-destructive" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg font-medium">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-muted-foreground">{errorMessage(error)}</p>
    </main>
  );
}

export function AppNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <h1 className="font-display text-2xl tracking-tight">Not in this world</h1>
      <p className="max-w-md text-sm text-muted-foreground">That page is not part of the gym.</p>
      <a href="/" className="text-sm underline underline-offset-4">
        Back to Aperture
      </a>
    </main>
  );
}
