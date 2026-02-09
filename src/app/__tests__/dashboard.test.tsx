import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

const defaultLifts = [
  "Bench Press (Barbell)",
  "Deadlift (Barbell)",
  "Overhead Press (Barbell)",
  "Squat (Barbell)",
];

describe("Dashboard", () => {
  it("renders the empty-state header and default lift cards", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    defaultLifts.forEach((lift) => {
      expect(screen.getByText(lift)).toBeInTheDocument();
    });
  });
});
