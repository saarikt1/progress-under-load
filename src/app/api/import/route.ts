import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "@/server/csv-parser";
import { importCSV } from "@/server/import";
import { getAuthEnv, getSessionByToken, getCookieValue, getSessionCookieName } from "@/server/auth";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Max rows to import
const MAX_ROWS = 10_000;

export async function POST(request: NextRequest) {
    try {
        // Get auth environment and DB
        const env = await getAuthEnv();
        const db = env.DB;

        // Validate session
        const sessionToken = getCookieValue(request, getSessionCookieName());
        if (!sessionToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const session = await getSessionByToken(db, sessionToken);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Validate file type
        const validTypes = ["text/csv", "application/vnd.ms-excel"];
        if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
            return NextResponse.json(
                { error: "Invalid file type. Please upload a CSV file." },
                { status: 400 }
            );
        }

        // Read file content
        const fileContent = await file.text();

        // Parse CSV
        const parseResult = parseCSV(fileContent);

        // Check for parse errors
        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                {
                    error: "CSV parsing failed",
                    details: parseResult.errors.slice(0, 10), // Return first 10 errors
                },
                { status: 400 }
            );
        }

        // Validate row count
        if (parseResult.rows.length > MAX_ROWS) {
            return NextResponse.json(
                { error: `Too many rows. Maximum is ${MAX_ROWS} rows.` },
                { status: 400 }
            );
        }

        // Import data
        const importResult = await importCSV(
            session.user.id,
            file.name,
            parseResult.rows,
            db
        );

        // Return success response
        return NextResponse.json({
            success: true,
            import_id: importResult.importId,
            rows_seen: importResult.rowsSeen,
            rows_inserted: importResult.rowsInserted,
            max_end_time_seen: importResult.maxEndTimeSeen,
            errors: importResult.errors,
        });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json(
            {
                error: "Import failed",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
