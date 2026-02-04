import { render, screen } from "@testing-library/react";
import AppShell from "@/components/app-shell";

const renderLayout = () =>
  render(
    <AppShell>
      <div>Child content</div>
    </AppShell>
  );

describe("AppShell", () => {
  it("renders the primary navigation links", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });
});
