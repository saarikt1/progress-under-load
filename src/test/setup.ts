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

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--mock-geist-sans" }),
  Geist_Mono: () => ({ variable: "--mock-geist-mono" }),
}));
