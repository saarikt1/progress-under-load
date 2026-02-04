import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page">
      <h1>Page not found</h1>
      <p className="muted">We couldn't find that page. Head back to the dashboard.</p>
      <Link className="link" href="/">
        Back to dashboard
      </Link>
    </section>
  );
}
