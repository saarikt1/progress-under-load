import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import UploadPage from "@/app/upload/page";

// A minimal coach comment containing a GFM table
const COACH_WITH_TABLE = `
Great work this week!

| Lift | Best Set | Est. 1RM |
|------|----------|----------|
| Squat | 75 kg × 3 | 81.5 kg |
| Bench Press | 50 kg × 2 | 54.5 kg |

Keep pushing.
`;

function mockFetch({
    importResponse = {
        success: true,
        import_id: "imp-1",
        rows_seen: 10,
        rows_inserted: 5,
        max_end_time_seen: "2026-01-18T00:00:00Z",
    },
    coachResponse = { comment: COACH_WITH_TABLE },
}: {
    importResponse?: object;
    coachResponse?: object;
} = {}) {
    return vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "/api/import") {
            return new Response(JSON.stringify(importResponse), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (url === "/api/coach") {
            return new Response(JSON.stringify(coachResponse), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response("Not found", { status: 404 });
    });
}

describe("UploadPage — coach markdown rendering", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders a GFM table as an HTML <table>, not raw pipe-separated text", async () => {
        mockFetch();

        render(<UploadPage />);

        const fileInput = screen.getByLabelText(/select csv file/i);
        const file = new File(["date,exercise\n2026-01-18,Squat"], "test.csv", {
            type: "text/csv",
        });

        // Simulate file selection
        Object.defineProperty(fileInput, "files", {
            value: [file],
            writable: false,
        });
        await act(async () => {
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        });

        // Click upload
        await act(async () => {
            screen
                .getByRole("button", { name: /upload & import/i })
                .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        });

        // Wait for coach comment section
        await waitFor(() => {
            expect(screen.getByText(/coach says/i)).toBeInTheDocument();
        });

        // The GFM table must render as actual <table> HTML, not raw `| … |` text
        await waitFor(() => {
            const tables = document.querySelectorAll("table");
            expect(tables.length).toBeGreaterThanOrEqual(1);
        });

        // Column headers should be accessible via ARIA roles
        expect(
            await screen.findByRole("columnheader", { name: /lift/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("columnheader", { name: /best set/i })
        ).toBeInTheDocument();
    });
});
