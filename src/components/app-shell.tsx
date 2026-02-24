import type { ReactNode } from "react";
import Nav from "@/components/nav";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[calc(var(--radius)+0.5rem)] border bg-card px-4 py-4 sm:px-6 sm:py-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-wide">Progress Under Load</p>
          <p className="text-sm text-muted-foreground">Gym Training Analyzer</p>
        </div>
        <Nav />
      </header>
      <main className="mx-auto mt-10 w-full max-w-6xl">{children}</main>
    </div>
  );
}
