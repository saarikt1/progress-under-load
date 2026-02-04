import { DEFAULT_LIFTS } from "@/lib/constants";

export default function Home() {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>Dashboard</h1>
          <p className="muted">
            Upload a CSV export to unlock trends, PRs, and coaching insights.
          </p>
        </div>
        <button className="action" type="button">
          Upload CSV
        </button>
      </header>

      <div className="lift-grid">
        {DEFAULT_LIFTS.map((lift) => (
          <article key={lift} className="card">
            <div className="card-header">
              <h2 className="card-title">{lift}</h2>
              <span className="card-pill">Empty</span>
            </div>
            <p className="muted">No sessions yet. Import to see the last 7 days.</p>
            <div className="card-footer">
              <span className="stat-label">Last session</span>
              <span className="stat-value">--</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
