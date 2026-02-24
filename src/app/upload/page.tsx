"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface ImportResult {
  success: boolean;
  import_id: string;
  rows_seen: number;
  rows_inserted: number;
  max_end_time_seen: string;
  errors?: string[];
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachComment, setCoachComment] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Upload failed"
        );
      }

      setResult(data);

      if (data.import_id) {
        setCoachLoading(true);
        fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ import_id: data.import_id }),
        })
          .then((r) => r.json())
          .then((coachData: { comment?: string | null }) => {
            setCoachComment(coachData.comment ?? null);
          })
          .catch(() => {
            setCoachComment(null);
          })
          .finally(() => {
            setCoachLoading(false);
          });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setCoachComment(null);
    setCoachLoading(false);
  };

  return (
    <section className="page">
      <h1>Upload CSV</h1>
      <p className="muted">
        Upload your training CSV to import workout data and analyze your
        progress.
      </p>

      <div className="mt-8 max-w-2xl">
        {!result && (
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="file-upload"
                  className="block text-sm font-medium mb-2"
                >
                  Select CSV File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive font-medium">
                    Error: {error}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1"
                >
                  {uploading ? "Uploading..." : "Upload & Import"}
                </Button>
                {selectedFile && (
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    disabled={uploading}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-md">
                <h3 className="text-sm font-medium mb-2">Requirements:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maximum file size: 5 MB</li>
                  <li>• Maximum rows: 10,000</li>
                  <li>• Format: CSV with required workout columns</li>
                  <li>
                    • Re-uploading the same file will skip duplicate entries
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">Import Complete</h2>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Rows Processed:</span>
                  <span className="font-medium">{result.rows_seen}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Rows Inserted:</span>
                  <span className="font-medium">{result.rows_inserted}</span>
                </div>
                {result.rows_seen > 0 && result.rows_inserted === 0 && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      No new data was imported. This file may have been uploaded
                      previously, or all rows already exist in the database.
                    </p>
                  </div>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-sm font-medium mb-2">
                      {result.errors.length} rows had errors:
                    </p>
                    <ul className="text-xs space-y-1">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i} className="text-destructive">
                          {err}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li className="text-muted-foreground">
                          ... and {result.errors.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {(coachLoading || coachComment) && (
                <div className="mt-4 p-4 bg-muted/50 border rounded-md">
                  <p className="text-sm font-medium mb-1">Coach Says</p>
                  {coachLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Generating coach feedback…
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
                        h2: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>,
                        h3: ({ children }) => <p className="text-sm font-semibold mt-2 mb-0.5">{children}</p>,
                        p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                        ul: ({ children }) => <ul className="text-sm list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="text-sm list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        hr: () => <hr className="my-3 border-border" />,
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-2">
                            <table className="text-sm w-full border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead>{children}</thead>,
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
                        th: ({ children }) => (
                          <th className="text-left font-semibold py-1 pr-3 text-muted-foreground">{children}</th>
                        ),
                        td: ({ children }) => <td className="py-1 pr-3">{children}</td>,
                      }}
                    >
                      {coachComment}
                    </ReactMarkdown>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button asChild className="flex-1">
                  <Link href="/">View Dashboard</Link>
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Upload Another
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
