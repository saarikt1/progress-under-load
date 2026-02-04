"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="page">
      <h1>Something went wrong</h1>
      <p className="muted">Try refreshing the page or head back to the dashboard.</p>
      <button className="action" type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
