import type { ReactNode } from "react";
import Nav from "@/components/nav";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-title">Progress Under Load</span>
          <span className="brand-subtitle">Gym Training Analyzer</span>
        </div>
        <Nav />
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
