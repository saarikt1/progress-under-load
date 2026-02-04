import { render, screen } from "@testing-library/react";
import BenchPressPage from "@/app/exercises/bench-press/page";

describe("Exercise detail page", () => {
  it("renders the bench press heading and chart placeholder", () => {
    render(<BenchPressPage />);
    expect(screen.getByRole("heading", { name: "Bench Press" })).toBeInTheDocument();
    expect(screen.getByTestId("exercise-chart")).toBeInTheDocument();
  });
});
