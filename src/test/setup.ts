import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => React.createElement("img", props),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--mock-geist-sans" }),
  Geist_Mono: () => ({ variable: "--mock-geist-mono" }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");

  return {
    ...actual,
    ResponsiveContainer: ({
      width = 600,
      height = 300,
      children,
    }: {
      width?: number | string;
      height?: number | string;
      children: React.ReactNode | ((size: { width: number; height: number }) => React.ReactNode);
    }) => {
      const resolvedWidth = typeof width === "number" ? width : 600;
      const resolvedHeight = typeof height === "number" ? height : 300;

      return React.createElement(
        "div",
        { style: { width: resolvedWidth, height: resolvedHeight } },
        typeof children === "function"
          ? children({ width: resolvedWidth, height: resolvedHeight })
          : children
      );
    },
  };
});
